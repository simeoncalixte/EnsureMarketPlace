import { FastifyPluginAsync } from 'fastify';
import {
  LineOfBusinessPrimaryType,
} from '../../db/models';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import { RiskClassSchemaVersion } from '../../db/models/riskClassSchema.models';
import { RiskClassRegistry } from '../../db/models/riskClassRegistry.models';
import { publishSchemaVersion } from '../../services/pipeline/schema/publish';
import { resolveRiskClass } from '../../services/pipeline/registry/resolve';
import { upsertRegistry } from '../../services/pipeline/registry/upsert';
import { BenchmarkPrior } from '../../db/models/benchmarkPrior.models';
import { resolveBenchmarkPrior, type BenchmarkPriorRow } from '../../services/pipeline/benchmarkPriors/resolve';
import { upsertBenchmarkPrior } from '../../services/pipeline/benchmarkPriors/upsert';
import { computeCoverage, summarizeCoverage } from '../../services/pipeline/benchmarkPriors/coverage';
import { pageTemplateSchema } from './schemas';
import {
  RISK_CLASS_PAGE_KEY,
  addRiskClassField,
  findRiskClassTemplate,
  parseLobParam,
  removeRiskClassField,
  upsertRiskClassTemplate,
} from './pageTemplates.service';

/**
 * Generalized risk-class schema authoring + versioning, the risk-class registry
 * declaration, and the benchmark-prior credibility anchors. All keyed by the
 * `:lob` route param (`primaryCode` or `primaryCode/subTypeCode`).
 */
export const riskClassRoutes: FastifyPluginAsync = async (app) => {
  // -------------------------------------------------------------------------
  // Generalized risk-class schema authoring + versioning (Slice 1).
  // `:lob` accepts `primaryCode` or `primaryCode/subTypeCode` (slash URL-encoded).
  // The insured-subjects routes above remain as working aliases for the
  // `insured-subjects` page key.
  // -------------------------------------------------------------------------

  app.get(
    '/marketplace/risk-classes/:lob/schema',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the active draft/published schema template for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              pageKey: { type: 'string' },
              isOrgTemplate: { type: 'boolean' },
              pageTemplate: pageTemplateSchema,
            },
            required: ['lineOfBusinessCode', 'pageKey', 'isOrgTemplate', 'pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);
      const resolution = await findRiskClassTemplate(resolvedOrganizationId ?? null, pageKey, selection);
      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        pageKey,
        isOrgTemplate: resolution.isOrgTemplate,
        pageTemplate: resolution.definitionJson,
      });
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Create or replace the draft schema template for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['definitionJson'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            definitionJson: pageTemplateSchema,
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
          201: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        definitionJson: PageTemplateDefinition;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const saved = await upsertRiskClassTemplate({
        organizationId: resolvedOrganizationId ?? null,
        pageKey,
        selection,
        definitionJson: body.definitionJson,
      });

      return reply.code(201).send({ pageTemplate: saved.definitionJson });
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Add a field to a risk-class schema template section',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['sectionKey', 'field'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            sectionKey: { type: 'string' },
            field: {
              type: 'object',
              required: ['key', 'label'],
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        sectionKey: string;
        field: { key: string; label: string; type?: string; required?: boolean };
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await addRiskClassField({
          organizationId: resolvedOrganizationId ?? null,
          pageKey,
          selection: parseLobParam(params.lob),
          sectionKey: body.sectionKey,
          field: body.field,
        });
        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.delete(
    '/marketplace/risk-classes/:lob/schema/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Remove a field from a risk-class schema template section',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { pageTemplate: pageTemplateSchema },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        sectionKey: string;
        fieldKey: string;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await removeRiskClassField({
          organizationId: resolvedOrganizationId ?? null,
          pageKey,
          selection: parseLobParam(params.lob),
          sectionKey: body.sectionKey,
          fieldKey: body.fieldKey,
        });
        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.post(
    '/marketplace/risk-classes/:lob/schema/publish',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Compile the current draft template into a new immutable schema version',
        description:
          'Compiles the active draft template into an immutable, content-addressed risk_class_schema_versions row. Idempotent: republishing identical content returns the existing version.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
            publishedByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              created: { type: 'boolean' },
              version: { type: 'object', additionalProperties: true },
            },
            required: ['created', 'version'],
          },
          201: {
            type: 'object',
            properties: {
              created: { type: 'boolean' },
              version: { type: 'object', additionalProperties: true },
            },
            required: ['created', 'version'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        pageKey?: string;
        publishedByUserId?: number | null;
      };
      const pageKey = String(body.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);
      const resolution = await findRiskClassTemplate(resolvedOrganizationId ?? null, pageKey, selection);

      const { version, created } = await publishSchemaVersion({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        pageKey,
        definitionJson: resolution.definitionJson,
        sourceTemplateId: resolution.sourceTemplateId,
        publishedByUserId: body.publishedByUserId ?? null,
      });

      return reply.code(created ? 201 : 200).send({ created, version: version.toJSON() });
    },
  );

  app.get(
    '/marketplace/risk-classes/:lob/schema/versions',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List published schema versions (audit history) for an org + risk class',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              versions: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
            required: ['versions'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const rows = await RiskClassSchemaVersion.findAll({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          pageKey,
        },
        order: [['schemaVersion', 'DESC']],
      });

      return reply.code(200).send({ versions: rows.map((row) => row.toJSON()) });
    },
  );

  app.get(
    '/marketplace/risk-classes/:lob/schema/versions/:v',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Fetch a frozen schema version + compiled JSON Schema',
        params: {
          type: 'object',
          required: ['lob', 'v'],
          properties: { lob: { type: 'string' }, v: { type: 'integer' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            pageKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              version: { type: 'object', additionalProperties: true },
            },
            required: ['version'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string; v: number };
      const query = (request.query ?? {}) as { organizationId?: number | null; pageKey?: string };
      const pageKey = String(query.pageKey ?? RISK_CLASS_PAGE_KEY).trim() || RISK_CLASS_PAGE_KEY;
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const row = await RiskClassSchemaVersion.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          pageKey,
          schemaVersion: Number(params.v),
        },
      });

      if (!row) {
        return reply.code(404).send({ error: 'Schema version not found' });
      }

      return reply.code(200).send({ version: row.toJSON() });
    },
  );

  // -------------------------------------------------------------------------
  // Risk Class Registry (Slice 2) — the behavior declaration bound to a risk
  // class, as DATA. `:lob` accepts `primaryCode` or `primaryCode/subTypeCode`.
  //
  // GET returns the org's declaration when one exists, otherwise the RESOLVED
  // default (org/platform ladder → generic default), so a caller always gets a
  // usable bundle. PUT upserts the org's declaration.
  //
  // NOTE: no modeling/pricing/appetite engine consumes these yet — Slice 2 ships
  // the spine and the socket only. Adoption is Slices 4/5.
  // -------------------------------------------------------------------------

  app.get(
    '/marketplace/risk-classes/:lob/registry',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the risk-class registry declaration (or resolved default) for an org + risk class',
        description:
          "Returns the org's stored registry declaration for the risk class when one exists, otherwise the resolved default (specificity ladder → generic default). Always returns a usable resolution.",
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              hasOrgDeclaration: { type: 'boolean' },
              declaration: { type: ['object', 'null'], additionalProperties: true },
              resolution: { type: 'object', additionalProperties: true },
            },
            required: ['lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'hasOrgDeclaration', 'resolution'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null };
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      // The org's own stored declaration (exact scope), if any.
      let declaration: RiskClassRegistry | null = null;
      try {
        declaration = await RiskClassRegistry.findOne({
          where: {
            organizationId: resolvedOrganizationId ?? null,
            lineOfBusinessCode: selection.primaryCode,
            lineOfBusinessSubTypeCode: selection.subTypeCode,
          },
        });
      } catch {
        // Degrade gracefully — fall back to the resolver below.
        declaration = null;
      }

      const resolution = await resolveRiskClass(
        resolvedOrganizationId ?? null,
        selection.primaryCode,
        selection.subTypeCode,
      );

      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        hasOrgDeclaration: Boolean(declaration),
        declaration: declaration ? declaration.toJSON() : null,
        resolution,
      });
    },
  );

  app.put(
    '/marketplace/risk-classes/:lob/registry',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Upsert the risk-class registry declaration for an org + risk class',
        description:
          'Upserts the org-scoped registry declaration (data, not code): modeling/rating method names, appetite dimensions, required data fields, default method params, and the active schema version.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            activeSchemaVersionId: { type: ['integer', 'null'] },
            riskModelingMethod: { type: ['string', 'null'] },
            ratingMethod: { type: ['string', 'null'] },
            appetiteDimensionsJson: { type: 'object', additionalProperties: true },
            requiredDataFieldsJson: { type: 'array', items: { type: 'string' } },
            methodParamsJson: { type: 'object', additionalProperties: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { declaration: { type: 'object', additionalProperties: true } },
            required: ['declaration'],
          },
          201: {
            type: 'object',
            properties: { declaration: { type: 'object', additionalProperties: true } },
            required: ['declaration'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        activeSchemaVersionId?: number | null;
        riskModelingMethod?: string | null;
        ratingMethod?: string | null;
        appetiteDimensionsJson?: Record<string, unknown>;
        requiredDataFieldsJson?: string[];
        methodParamsJson?: Record<string, unknown>;
        status?: 'active' | 'inactive';
        createdByUserId?: number | null;
      };
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const existed = await RiskClassRegistry.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
        },
      });

      const saved = await upsertRegistry({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        activeSchemaVersionId: body.activeSchemaVersionId,
        riskModelingMethod: body.riskModelingMethod,
        ratingMethod: body.ratingMethod,
        appetiteDimensionsJson: body.appetiteDimensionsJson,
        requiredDataFieldsJson: body.requiredDataFieldsJson,
        methodParamsJson: body.methodParamsJson,
        status: body.status,
        createdByUserId: body.createdByUserId ?? null,
      });

      return reply.code(existed ? 200 : 201).send({ declaration: saved.toJSON() });
    },
  );

  // -------------------------------------------------------------------------
  // Benchmark priors (Slice 5.0) — the credibility-weighting anchors bound to a
  // risk class. Same `:lob` convention and tenant/error patterns as the registry
  // routes above. `:lob` = primaryCode or primaryCode/subTypeCode.
  // -------------------------------------------------------------------------

  // Coverage report (Slice 5.3) — for each PRIMARY taxonomy line, whether a
  // PLATFORM-DEFAULT benchmark prior exists (cited) or it falls back to generic.
  // Read-only + additive. Registered BEFORE `/:lob` so the static `coverage`
  // segment is matched first (Fastify gives static segments priority anyway).
  app.get(
    '/marketplace/benchmark-priors/coverage',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Benchmark-prior coverage across the primary taxonomy lines',
        description:
          'For each of the primary line-of-business taxonomy codes, reports whether a platform-default benchmark prior is cited and where it resolves from (platform_primary / platform_subtype / none). Read-only.',
        response: {
          200: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  covered: { type: 'integer' },
                  uncovered: { type: 'integer' },
                },
                required: ['total', 'covered', 'uncovered'],
              },
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    label: { type: 'string' },
                    hasPlatformPrior: { type: 'boolean' },
                    resolvedFrom: { type: 'string' },
                    source: { type: ['string', 'null'] },
                  },
                  required: ['code', 'label', 'hasPlatformPrior', 'resolvedFrom', 'source'],
                },
              },
            },
            required: ['summary', 'lines'],
          },
        },
      },
    },
    async (_request, reply) => {
      const [primaries, priorInstances] = await Promise.all([
        LineOfBusinessPrimaryType.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
        BenchmarkPrior.findAll({ where: { organizationId: null, status: 'active' } }),
      ]);

      const taxonomyLines = primaries.map((p) => ({ code: p.code, label: p.label }));
      const platformRows: BenchmarkPriorRow[] = priorInstances.map((p) => {
        const json = p.toJSON() as Record<string, unknown>;
        const num = (v: unknown): number | null => {
          if (v == null) return null;
          const n = typeof v === 'number' ? v : Number(v);
          return Number.isFinite(n) ? n : null;
        };
        return {
          id: p.id,
          organizationId: p.organizationId,
          lineOfBusinessCode: p.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: p.lineOfBusinessSubTypeCode,
          exposureBasis: p.exposureBasis ?? null,
          lossRate: num(json.lossRate),
          targetLossRatio: num(json.targetLossRatio),
          expenseRatio: num(json.expenseRatio),
          marginTarget: num(json.marginTarget),
          fullCredibilityStandard: num(json.fullCredibilityStandard),
          paramsJson: (p.paramsJson as Record<string, unknown>) ?? {},
          source: p.source,
          sourceUrl: p.sourceUrl ?? null,
          asOfDate: p.asOfDate ?? null,
          status: p.status,
        };
      });

      const lines = computeCoverage(taxonomyLines, platformRows);
      return reply.code(200).send({ summary: summarizeCoverage(lines), lines });
    },
  );

  app.get(
    '/marketplace/benchmark-priors/:lob',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Get the resolved benchmark prior for an org + risk class',
        description:
          "Returns the org's stored prior (exact scope) when one exists, plus the resolved prior via the specificity ladder (org+subtype → org+primary → platform+subtype → platform+primary → none). Every prior carries a required source citation.",
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lineOfBusinessCode: { type: 'string' },
              lineOfBusinessSubTypeCode: { type: 'string' },
              hasOrgPrior: { type: 'boolean' },
              prior: { type: ['object', 'null'], additionalProperties: true },
              resolvedFrom: { type: 'string' },
              resolvedPrior: { type: ['object', 'null'], additionalProperties: true },
            },
            required: ['lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'hasOrgPrior', 'resolvedFrom'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const query = (request.query ?? {}) as { organizationId?: number | null };
      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      let orgPrior: BenchmarkPrior | null = null;
      try {
        orgPrior = await BenchmarkPrior.findOne({
          where: {
            organizationId: resolvedOrganizationId ?? null,
            lineOfBusinessCode: selection.primaryCode,
            lineOfBusinessSubTypeCode: selection.subTypeCode,
          },
        });
      } catch {
        orgPrior = null;
      }

      const resolution = await resolveBenchmarkPrior(
        resolvedOrganizationId ?? null,
        selection.primaryCode,
        selection.subTypeCode,
      );

      return reply.code(200).send({
        lineOfBusinessCode: selection.primaryCode,
        lineOfBusinessSubTypeCode: selection.subTypeCode,
        hasOrgPrior: Boolean(orgPrior),
        prior: orgPrior ? orgPrior.toJSON() : null,
        resolvedFrom: resolution.resolvedFrom,
        resolvedPrior: resolution.prior,
      });
    },
  );

  app.put(
    '/marketplace/benchmark-priors/:lob',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Upsert the benchmark prior for an org + risk class',
        description:
          'Upserts the org-scoped benchmark prior (data, not code). A required source citation must be present when creating a new prior.',
        params: {
          type: 'object',
          required: ['lob'],
          properties: { lob: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            exposureBasis: { type: ['string', 'null'] },
            lossRate: { type: ['number', 'string', 'null'] },
            targetLossRatio: { type: ['number', 'string', 'null'] },
            expenseRatio: { type: ['number', 'string', 'null'] },
            marginTarget: { type: ['number', 'string', 'null'] },
            fullCredibilityStandard: { type: ['number', 'string', 'null'] },
            paramsJson: { type: 'object', additionalProperties: true },
            source: { type: 'string' },
            sourceUrl: { type: ['string', 'null'] },
            asOfDate: { type: ['string', 'null'] },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdByUserId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: { prior: { type: 'object', additionalProperties: true } },
            required: ['prior'],
          },
          201: {
            type: 'object',
            properties: { prior: { type: 'object', additionalProperties: true } },
            required: ['prior'],
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { lob: string };
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        exposureBasis?: string | null;
        lossRate?: number | string | null;
        targetLossRatio?: number | string | null;
        expenseRatio?: number | string | null;
        marginTarget?: number | string | null;
        fullCredibilityStandard?: number | string | null;
        paramsJson?: Record<string, unknown>;
        source?: string;
        sourceUrl?: string | null;
        asOfDate?: string | null;
        status?: 'active' | 'inactive';
        createdByUserId?: number | null;
      };
      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const selection = parseLobParam(params.lob);

      const existed = await BenchmarkPrior.findOne({
        where: {
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
        },
      });

      try {
        const saved = await upsertBenchmarkPrior({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: selection.primaryCode,
          lineOfBusinessSubTypeCode: selection.subTypeCode,
          exposureBasis: body.exposureBasis,
          lossRate: body.lossRate,
          targetLossRatio: body.targetLossRatio,
          expenseRatio: body.expenseRatio,
          marginTarget: body.marginTarget,
          fullCredibilityStandard: body.fullCredibilityStandard,
          paramsJson: body.paramsJson,
          source: body.source,
          sourceUrl: body.sourceUrl,
          asOfDate: body.asOfDate,
          status: body.status,
          createdByUserId: body.createdByUserId ?? null,
        });

        return reply.code(existed ? 200 : 201).send({ prior: saved.toJSON() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upsert benchmark prior';
        return reply.code(400).send({ error: message });
      }
    },
  );
};
