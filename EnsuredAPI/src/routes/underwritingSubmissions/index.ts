import { FastifyPluginAsync } from 'fastify';
import { ComplianceClearance, ExposureUnit, InsurerProfile, Organization, Policy, PolicyVersion, Submission, WorkflowState } from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import { computeForSubmission } from '../../services/pipeline/compute/service';
import { screenSubmissionForCompliance } from '../../services/pipeline/preBindCompliance/service';
import { ComplianceGateError, issueQuoteForSubmission, transitionQuote, type QuoteAction } from '../../services/underwriting/quote/service';
import { bindQuoteForSubmission, endorsePolicy } from '../../services/underwriting/policy/service';
import {
  COMPLIANCE_GATED_STATUSES,
  buildDashboard,
  collectAllowedStatuses,
  complianceBlockReason,
  normalizeBoardConfig,
  policySummary,
} from './service';

export const underwritingSubmissionsRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/underwriting/submissions',
    {
      schema: {
        description: 'Return the live underwriting submissions dashboard for the current organization (all submissions, including ones still in-flight through the pipeline).',
      },
    },
    async (request, reply) => reply.code(200).send(await buildDashboard(request)),
  );

  app.put(
    '/underwriting/submissions/config',
    {
      schema: {
        description: 'Update the underwriting board configuration for the current organization.',
        body: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      if (!organizationId) {
        return reply.code(400).send({ error: 'organization_required' });
      }

      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return reply.code(404).send({ error: 'organization_not_found' });
      }

      await organization.update({ submissionBoardConfig: request.body as Record<string, unknown> });
      const dashboard = await buildDashboard(request);
      return reply.code(200).send(dashboard.config);
    },
  );

  app.patch(
    '/underwriting/submissions/:id/status',
    {
      schema: {
        description: 'Advance a submission to another backend-configured stage.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      const organization = organizationId ? await Organization.findByPk(organizationId) : null;
      const config = normalizeBoardConfig(organization?.submissionBoardConfig ?? null);
      const allowedStatuses = collectAllowedStatuses(config);
      const { id } = request.params as { id: number };
      const { status } = request.body as { status: string };

      if (!allowedStatuses.includes(status)) {
        return reply.code(400).send({ error: 'status_not_enabled', allowedStatuses });
      }

      const where: Record<string, unknown> = { id };
      const include: Array<Record<string, unknown>> = [];

      if (organizationId) {
        include.push({
          model: InsurerProfile,
          as: 'insurerProfile',
          required: true,
          where: { organizationId },
          include: [{ model: Organization, as: 'organization' }],
        });
      }

      const submission = await Submission.findOne({ where, include });
      if (!submission) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      // Pre-bind compliance gate (Issue 1): block the move into a quote/bind-ready
      // status unless the submission's latest ComplianceClearance has passed. This
      // is the single server-side enforcement point — the UI gate is advisory only.
      if (COMPLIANCE_GATED_STATUSES.has(status)) {
        const clearance = await ComplianceClearance.findOne({
          where: { submissionId: submission.id },
          order: [['createdAt', 'DESC'], ['id', 'DESC']],
        });
        if (!clearance || clearance.status !== 'passed') {
          return reply.code(409).send({
            error: 'compliance_gate_blocked',
            reason: complianceBlockReason(clearance),
            complianceStatus: clearance?.status ?? null,
            requiredStatus: 'passed',
          });
        }
      }

      await submission.update({ status });

      const [workflowState] = await WorkflowState.findOrCreate({
        where: { submissionId: submission.id },
        defaults: {
          submissionId: submission.id,
          organizationId: submission.organizationId ?? null,
          status,
          assignedTo: submission.submittedByUserId ?? null,
          tasks: null,
        },
      });

      await workflowState.update({ status, organizationId: submission.organizationId ?? null });

      const dashboard = await buildDashboard(request);
      const item = dashboard.items.find((entry) => entry.id === submission.id);
      return reply.code(200).send(item ?? { ok: true });
    },
  );

  // Slice 5.0 — the credibility-weighted compute path. Resolves the risk class +
  // benchmark prior, runs the modeling/rating strategies, applies the credibility
  // blend (Z=0 today — no internal experience), and persists a ModelRun + a NEW
  // PricingVersion (+ RiskMetric when a Deal exists), with full provenance. var99
  // stays NULL (not modeled until the cat engine, 5.2); expectedReturn/riskScore
  // are derived-or-null+flagged — never the old constants. Recompute → new version.
  app.post(
    '/underwriting/submissions/:id/compute',
    {
      schema: {
        description:
          'Compute (and persist) loss + price for a submission via the credibility-weighted compute spine. Returns the computed result + full provenance. Recompute creates a new PricingVersion (audit trail preserved).',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };

      // Tenant scoping mirrors the status route: only enforce when an org resolves.
      const organizationId = await resolveOrganizationIdFromRequest(request);
      const submission = await Submission.findByPk(id);
      if (!submission) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }
      if (organizationId && submission.organizationId != null && submission.organizationId !== organizationId) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const result = await computeForSubmission(id);
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'compute_failed';
        const statusCode = message === 'submission_not_found' ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // Close-the-loop Issue 1 — run the pre-bind compliance screen (sanctions + carrier
  // licensing) and persist a ComplianceClearance. This is what unblocks the
  // bind/quote gate on the status route. Re-running creates a new clearance row
  // (append-only audit trail), mirroring the recompute → new PricingVersion pattern.
  app.post(
    '/underwriting/submissions/:id/compliance',
    {
      schema: {
        description:
          'Run pre-bind compliance screening (sanctions/OFAC + carrier admitted-status) for a submission and persist a ComplianceClearance. The bind/quote gate reads the latest clearance.',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };

      const organizationId = await resolveOrganizationIdFromRequest(request);
      const submission = await Submission.findByPk(id);
      if (!submission) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }
      if (organizationId && submission.organizationId != null && submission.organizationId !== organizationId) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const result = await screenSubmissionForCompliance(id);
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'compliance_failed';
        const statusCode = message === 'submission_not_found' ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // Close-the-loop Issue 2 — issue (or re-issue) a quote for a submission. Builds
  // the offer on the latest PricingVersion and enforces the SAME compliance gate
  // as `approved`: the latest clearance must have passed. Re-issuing appends a new
  // QuoteVersion (audit trail preserved), mirroring recompute → new PricingVersion.
  app.post(
    '/underwriting/submissions/:id/quote',
    {
      schema: {
        description:
          'Issue (or re-issue) a quote for a submission from its latest priced version. Gated on a passed pre-bind compliance clearance. Re-issue creates a new QuoteVersion.',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            validityDays: { type: 'integer', minimum: 1 },
            overrides: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = (request.body ?? {}) as { validityDays?: number; overrides?: Record<string, unknown> };

      const organizationId = await resolveOrganizationIdFromRequest(request);
      const submission = await Submission.findByPk(id);
      if (!submission) return reply.code(404).send({ error: 'submission_not_found' });
      if (organizationId && submission.organizationId != null && submission.organizationId !== organizationId) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const result = await issueQuoteForSubmission(id, {
          validityDays: body.validityDays,
          overrides: body.overrides,
        });
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof ComplianceGateError) {
          return reply.code(409).send({
            error: 'compliance_gate_blocked',
            reason: 'Pre-bind compliance must clear before a quote can be issued.',
            complianceStatus: error.complianceStatus,
            requiredStatus: 'passed',
          });
        }
        const message = error instanceof Error ? error.message : 'quote_failed';
        const statusCode = message === 'submission_not_found' ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // Advance a quote's lifecycle: accept / decline / withdraw (expire is a system
  // action). Updates the latest QuoteVersion + the Quote header.
  app.patch(
    '/underwriting/submissions/:id/quote',
    {
      schema: {
        description: 'Transition a submission\'s quote (accept | decline | withdraw).',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          required: ['action'],
          additionalProperties: false,
          properties: {
            action: { type: 'string', enum: ['accept', 'decline', 'withdraw'] },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const { action, reason } = request.body as { action: QuoteAction; reason?: string };

      const organizationId = await resolveOrganizationIdFromRequest(request);
      const submission = await Submission.findByPk(id);
      if (!submission) return reply.code(404).send({ error: 'submission_not_found' });
      if (organizationId && submission.organizationId != null && submission.organizationId !== organizationId) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const result = await transitionQuote(id, action, { reason: reason ?? null });
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'quote_transition_failed';
        const statusCode = message === 'quote_not_found' ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // Bind an ACCEPTED quote → create an in-force Policy + its issuance PolicyVersion.
  // This is the single point where a quote graduates into a managed policy.
  app.post(
    '/underwriting/submissions/:id/bind',
    {
      schema: {
        description: 'Bind a submission\'s accepted quote into an in-force Policy (+ issuance PolicyVersion).',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            policyType: { type: 'string', enum: ['homeowners', 'commercial', 'auto', 'marine', 'life'] },
            effectiveDate: { type: 'string' },
            expirationDate: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = (request.body ?? {}) as {
        policyType?: 'homeowners' | 'commercial' | 'auto' | 'marine' | 'life';
        effectiveDate?: string;
        expirationDate?: string;
      };

      const organizationId = await resolveOrganizationIdFromRequest(request);
      const submission = await Submission.findByPk(id);
      if (!submission) return reply.code(404).send({ error: 'submission_not_found' });
      if (organizationId && submission.organizationId != null && submission.organizationId !== organizationId) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const result = await bindQuoteForSubmission(id, {
          policyType: body.policyType,
          effectiveDate: body.effectiveDate ?? null,
          expirationDate: body.expirationDate ?? null,
        });
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'bind_failed';
        const statusCode = message === 'submission_not_found' || message === 'quote_not_found' ? 404 : 409;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // Endorse / cancel / renew an in-force policy — appends a new immutable
  // PolicyVersion and updates the Policy header's current snapshot.
  app.post(
    '/underwriting/policies/:id/endorse',
    {
      schema: {
        description: 'Append a PolicyVersion (endorsement | cancellation | renewal) to an in-force policy.',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            changeType: { type: 'string', enum: ['endorsement', 'cancellation', 'renewal'] },
            status: { type: 'string', enum: ['in_force', 'cancelled', 'expired', 'lapsed'] },
            premium: { type: ['number', 'string'] },
            coverageLimit: { type: ['number', 'string'] },
            deductible: { type: ['number', 'string'] },
            expirationDate: { type: 'string' },
            effectiveFrom: { type: 'string' },
            reason: { type: 'string' },
            terms: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const changes = (request.body ?? {}) as Record<string, unknown>;

      const organizationId = await resolveOrganizationIdFromRequest(request);
      const policy = await Policy.findByPk(id);
      if (!policy) return reply.code(404).send({ error: 'policy_not_found' });
      if (organizationId) {
        const profile = await InsurerProfile.findByPk(policy.insurerProfileId);
        if (profile && profile.organizationId !== organizationId) {
          return reply.code(404).send({ error: 'policy_not_found' });
        }
      }

      try {
        const result = await endorsePolicy(id, changes as never);
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'endorse_failed';
        const statusCode = message === 'policy_not_found' ? 404 : 409;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  // List the organization's policies (the in-force book). Org-scoped via the
  // insurer profile, mirroring the submissions board; returns a summary per policy.
  app.get(
    '/underwriting/policies',
    { schema: { description: 'List the current organization\'s policies (the in-force book) with a summary per policy.' } },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      const where: Record<string, unknown> = {};
      if (organizationId) {
        const profiles = await InsurerProfile.findAll({ where: { organizationId }, attributes: ['id'] });
        const profileIds = profiles.map((p) => p.id);
        if (profileIds.length === 0) return reply.code(200).send({ items: [], counts: { total: 0, in_force: 0 } });
        where.insurerProfileId = profileIds;
      }

      const policies = await Policy.findAll({ where, order: [['createdAt', 'DESC']] });
      const items = policies.map(policySummary);
      const counts = {
        total: items.length,
        in_force: items.filter((p) => p.status === 'in_force').length,
      };
      return reply.code(200).send({ items, counts });
    },
  );

  // A single policy with its full PolicyVersion history and ExposureUnit schedule.
  app.get(
    '/underwriting/policies/:id',
    {
      schema: {
        description: 'A policy with its version history (issuance + endorsements) and scheduled exposures.',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const policy = await Policy.findByPk(id);
      if (!policy) return reply.code(404).send({ error: 'policy_not_found' });

      const organizationId = await resolveOrganizationIdFromRequest(request);
      if (organizationId) {
        const profile = await InsurerProfile.findByPk(policy.insurerProfileId);
        if (profile && profile.organizationId !== organizationId) {
          return reply.code(404).send({ error: 'policy_not_found' });
        }
      }

      const [versions, exposures] = await Promise.all([
        PolicyVersion.findAll({ where: { policyId: id }, order: [['versionNumber', 'ASC']] }),
        ExposureUnit.findAll({ where: { policyId: id }, order: [['subjectIndex', 'ASC']] }),
      ]);

      return reply.code(200).send({
        policy: policySummary(policy),
        versions: versions.map((v) => ({
          versionNumber: v.versionNumber,
          changeType: v.changeType,
          status: v.status,
          premium: Number(v.premium),
          coverageLimit: v.coverageLimit != null ? Number(v.coverageLimit) : null,
          deductible: v.deductible != null ? Number(v.deductible) : null,
          effectiveDate: v.effectiveDate ? String(v.effectiveDate) : null,
          expirationDate: v.expirationDate ? String(v.expirationDate) : null,
          effectiveFrom: v.effectiveFrom ? String(v.effectiveFrom) : null,
          reason: v.reason ?? null,
          sourceQuoteVersionId: v.sourceQuoteVersionId ?? null,
        })),
        exposures: exposures.map((e) => ({
          exposureRef: e.exposureRef,
          subjectLabel: e.subjectLabel ?? null,
          subjectIndex: e.subjectIndex ?? null,
          assetType: e.assetType,
          constructionType: e.constructionType ?? null,
          occupancyType: e.occupancyType ?? null,
          replacementCost: e.replacementCost != null ? Number(e.replacementCost) : null,
        })),
      });
    },
  );
};

export default underwritingSubmissionsRoute;
