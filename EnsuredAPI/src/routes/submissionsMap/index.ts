import { FastifyPluginAsync } from 'fastify';
import { Op, WhereOptions } from 'sequelize';
import { InsurerProfile, Organization, RiskPortfolio, Submission, SubmissionOutput, User, WorkflowState } from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import { humanize, formatRelativeTime } from '../../services/lib/boardFormat';
import { pickSubmissionLocation, pickSubmissionType, pointNemoPlaceholder } from './geo';
import { resolveMatchingSubmissionIds } from '../marketplace/dynamicFilters.service';

type SubmissionWithRelations = Submission & {
  portfolio?: RiskPortfolio | null;
  insurerProfile?: (InsurerProfile & { organization?: Organization | null }) | null;
  workflowState?: (WorkflowState & { assignedToUser?: User | null }) | null;
  submittedBy?: User | null;
};

function parseCsvTokens(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => parseCsvTokens(entry));
  }
  if (typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseIntegerCsv(raw: unknown): number[] {
  return parseCsvTokens(raw)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

/**
 * Submissions map layer — every submission for the current organization as a
 * GeoJSON point, regardless of pipeline status. Submissions whose location has
 * not been geocoded yet (early-pipeline, or geocoding failed) are placed at
 * Point Nemo so they are still visible without faking a real location (see geo.ts).
 *
 * Org-scoped like the underwriting board (InsurerProfile org join). Read-only.
 */
export const submissionsMapRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/submissions-map',
    {
      schema: {
        description:
          'All submissions for the current organization as a GeoJSON FeatureCollection of points (one per submission). Locationless submissions are placed in open ocean.',
        querystring: {
          type: 'object',
          properties: {
            broker: { type: 'string' },
            carrier: { type: 'string' },
            submissionStatus: { type: 'string' },
            catPeril: { type: 'string' },
            catBand: { type: 'string' },
            catModelVersion: { type: 'string' },
            catRecommendedAction: { type: 'string' },
            catScoreMin: { type: 'number' },
            catScoreMax: { type: 'number' },
            lob: { type: 'string' },
            sub: { type: 'string' },
            peril: { type: 'string' },
            geography: { type: 'string' },
            tivMin: { type: 'number' },
            tivMax: { type: 'number' },
            limitMin: { type: 'number' },
            limitMax: { type: 'number' },
            attachmentMin: { type: 'number' },
            attachmentMax: { type: 'number' },
          },
          additionalProperties: true,
        },
      },
    },
    async (request, reply) => {
      const organizationId = await resolveOrganizationIdFromRequest(request);
      const rawQuery = (request.query ?? {}) as Record<string, unknown>;

      const selectedBrokerIds = parseIntegerCsv(rawQuery.broker);
      const selectedCarrierIds = parseIntegerCsv(rawQuery.carrier);
      const selectedStatuses = parseCsvTokens(rawQuery.submissionStatus);
      const submissionWhere: WhereOptions<Submission> = {};
      if (selectedStatuses.length > 0) {
        submissionWhere.status = { [Op.in]: selectedStatuses };
      }

      let submissions = await Submission.findAll({
        where: submissionWhere,
        include: [
          {
            model: InsurerProfile,
            as: 'insurerProfile',
            ...(organizationId
              ? {
                  required: true,
                  where: { organizationId },
                  include: [
                    {
                      model: Organization,
                      as: 'organization',
                      ...(selectedCarrierIds.length > 0 ? { where: { id: { [Op.in]: selectedCarrierIds } }, required: true } : {}),
                    },
                  ],
                }
              : {
                  include: [
                    {
                      model: Organization,
                      as: 'organization',
                      ...(selectedCarrierIds.length > 0 ? { where: { id: { [Op.in]: selectedCarrierIds } }, required: true } : {}),
                    },
                  ],
                }),
          },
          { model: RiskPortfolio, as: 'portfolio' },
          { model: WorkflowState, as: 'workflowState', include: [{ model: User, as: 'assignedToUser' }] },
          {
            model: User,
            as: 'submittedBy',
            ...(selectedBrokerIds.length > 0
              ? {
                  required: true,
                  include: [{ model: Organization, as: 'organization', required: true, where: { id: { [Op.in]: selectedBrokerIds } } }],
                }
              : {}),
          },
        ] as never,
        order: [['receivedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']],
      });

      const resolverQuery = { ...rawQuery };
      delete resolverQuery.broker;
      delete resolverQuery.carrier;
      delete resolverQuery.submissionStatus;
      const allowedSubmissionIds = await resolveMatchingSubmissionIds({
        query: resolverQuery,
        baseSubmissionIds: submissions.map((submission) => submission.id),
      }).catch(() => null);
      if (allowedSubmissionIds) {
        submissions = submissions.filter((submission) => allowedSubmissionIds.has(submission.id));
      }

      if (submissions.length === 0) {
        return reply.code(200).send({ type: 'FeatureCollection', features: [] });
      }

      const outputs = await SubmissionOutput.findAll({
        where: { submissionId: submissions.map((s) => s.id) },
        attributes: ['submissionId', 'structuredData'],
      });
      // Latest-wins: outputs come back oldest-first by default; keep overwriting.
      const outputBySubmission = new Map<number, Record<string, unknown> | null>();
      for (const out of outputs) {
        if (out.submissionId != null) outputBySubmission.set(out.submissionId, out.structuredData);
      }

      const features = submissions.map((row) => {
        const submission = row as SubmissionWithRelations;
        const portfolio = submission.portfolio;
        const insurerProfile = submission.insurerProfile;
        const insurerOrganization = insurerProfile?.organization;
        const workflowState = submission.workflowState;
        const assignee = workflowState?.assignedToUser;
        const submittingUser = submission.submittedBy;

        const owner =
          [assignee?.firstName, assignee?.lastName].filter(Boolean).join(' ').trim() ||
          [submittingUser?.firstName, submittingUser?.lastName].filter(Boolean).join(' ').trim() ||
          submittingUser?.email ||
          'Unassigned';

        const structuredData = outputBySubmission.get(submission.id) ?? null;
        const located = pickSubmissionLocation(structuredData);
        const submissionType = pickSubmissionType(structuredData);
        const coord = located ?? pointNemoPlaceholder(submission.id);

        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [coord.longitude, coord.latitude] },
          properties: {
            submissionId: submission.id,
            submissionNumber: `SUB-${String(submission.id).padStart(4, '0')}`,
            status: String(submission.status ?? 'unknown'),
            submissionTypeCode: submissionType.code,
            submissionTypeLabel: submissionType.label,
            cedent: insurerOrganization?.name ?? 'Unspecified cedent',
            lineOfBusiness: humanize(portfolio?.perilType ?? portfolio?.name ?? null),
            region: portfolio?.region ?? 'Unspecified',
            owner,
            assigned: Boolean(assignee),
            located: Boolean(located),
            receivedLabel: formatRelativeTime(submission.receivedAt ?? submission.createdAt),
          },
        };
      });

      return reply.code(200).send({ type: 'FeatureCollection', features });
    },
  );
};

export default submissionsMapRoute;
