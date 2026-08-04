import { FastifyPluginAsync } from 'fastify';
import { SchemaGenerationService, loadOptionSet, loadSuggestedForm, resolveBaselineForm } from '../../../services/pipeline/schemaGeneration/service';
import {
  computeFieldImpact,
  removeCreateCoverageTemplateField,
  removeInsuredSubjectTemplateField,
} from '../../../services/pipeline/schemaGeneration/fieldRemoval';

export const schemaGenerationRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/schemaGeneration/health', async () => ({ status: 'ok', service: 'schemaGeneration' }));

  // Lazy-load the selection options for a generated form field, by the
  // `optionSetKey` it references. The create-coverage page fetches this on demand
  // the first time it renders the field. (Static segment — resolves ahead of the
  // `/:submissionId` param route below.)
  app.get<{ Params: { optionSetKey: string }; Querystring: { organizationId?: string } }>(
    '/pipeline/schemaGeneration/option-sets/:optionSetKey',
    {
      schema: {
        params: { type: 'object', properties: { optionSetKey: { type: 'string' } }, required: ['optionSetKey'] },
        querystring: { type: 'object', additionalProperties: true },
      },
    },
    async (request, reply) => {
      const orgRaw = request.query.organizationId;
      const organizationId = orgRaw !== undefined && orgRaw !== '' ? Number(orgRaw) : null;
      const set = await loadOptionSet(
        request.params.optionSetKey,
        Number.isFinite(organizationId as number) ? (organizationId as number) : null,
      );
      if (!set) return reply.code(404).send({ error: 'No option set for this key' });
      return set;
    },
  );

  // The resolved baseline form, optionally tailored by organization, line of
  // business, and portfolio size. Rendered by the create-coverage page until the
  // agent has tailored a form for a specific submission. (Static route —
  // resolves ahead of the `/:submissionId` param route below.)
  app.get<{ Querystring: { organizationId?: string; lineOfBusinessCode?: string; lineOfBusinessLabel?: string; lineOfBusinessSubTypeCode?: string; subjectCount?: string } }>(
    '/pipeline/schemaGeneration/baseline',
    { schema: { querystring: { type: 'object', additionalProperties: true } } },
    async (request) => {
      const { organizationId: orgRaw, lineOfBusinessCode, lineOfBusinessLabel, lineOfBusinessSubTypeCode, subjectCount } = request.query;
      const organizationId = orgRaw !== undefined && orgRaw !== '' ? Number(orgRaw) : null;
      const count = subjectCount !== undefined && subjectCount !== '' ? Number(subjectCount) : null;
      return resolveBaselineForm({
        organizationId: Number.isFinite(organizationId as number) ? (organizationId as number) : null,
        lineOfBusinessCode: lineOfBusinessCode ?? null,
        lineOfBusinessLabel: lineOfBusinessLabel ?? null,
        lineOfBusinessSubTypeCode: lineOfBusinessSubTypeCode ?? null,
        subjectCount: Number.isFinite(count as number) ? (count as number) : null,
      });
    },
  );

  // How many existing submissions have a populated value for a given field — the
  // impact the create-coverage page surfaces in its "remove field" confirm dialog.
  // Read-only; removal itself preserves this data. (Static segment — resolves
  // ahead of the `/:submissionId` param route below.)
  app.get<{ Querystring: { organizationId?: string; sectionKey?: string; fieldKey?: string } }>(
    '/pipeline/schemaGeneration/field-impact',
    { schema: { querystring: { type: 'object', additionalProperties: true } } },
    async (request, reply) => {
      const { organizationId: orgRaw, sectionKey, fieldKey } = request.query;
      const organizationId = orgRaw !== undefined && orgRaw !== '' ? Number(orgRaw) : Number.NaN;
      if (!Number.isFinite(organizationId) || !sectionKey || !fieldKey) {
        return reply.code(400).send({ error: 'organizationId, sectionKey and fieldKey are required' });
      }
      return computeFieldImpact(organizationId, sectionKey, fieldKey);
    },
  );

  // Remove an AI/custom, non-required field from the org's create-coverage
  // template, going forward. Existing submissions keep their data (the response
  // reports how many were using it). Base scaffold and required fields are
  // protected (403).
  app.delete<{
    Body: {
      organizationId?: number;
      lineOfBusinessCode?: string;
      lineOfBusinessSubTypeCode?: string;
      sectionKey?: string;
      fieldKey?: string;
    };
  }>(
    '/pipeline/schemaGeneration/template-field',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: 'number' },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const result = await removeCreateCoverageTemplateField({
        organizationId: Number(body.organizationId),
        lineOfBusinessCode: body.lineOfBusinessCode ?? '',
        lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode ?? '',
        sectionKey: body.sectionKey as string,
        fieldKey: body.fieldKey as string,
      });
      if (!result.ok) {
        const status = result.code === 'not_found' ? 404 : result.code === 'forbidden' ? 403 : 400;
        return reply.code(status).send({ error: result.message });
      }
      return result;
    },
  );

  // Remove an AI-generated field from the org's insured-subject template, going
  // forward. Same guard/semantics as create-coverage; targets the 'insured-subjects'
  // template and skips impact. A 404 (field was submission-local, not in the org
  // template) is expected and tolerated by the UI's optimistic removal.
  app.delete<{
    Body: {
      organizationId?: number;
      lineOfBusinessCode?: string;
      lineOfBusinessSubTypeCode?: string;
      sectionKey?: string;
      fieldKey?: string;
    };
  }>(
    '/pipeline/schemaGeneration/subject-template-field',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: 'number' },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const result = await removeInsuredSubjectTemplateField({
        organizationId: Number(body.organizationId),
        lineOfBusinessCode: body.lineOfBusinessCode ?? '',
        lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode ?? '',
        sectionKey: body.sectionKey as string,
        fieldKey: body.fieldKey as string,
      });
      if (!result.ok) {
        const status = result.code === 'not_found' ? 404 : result.code === 'forbidden' ? 403 : 400;
        return reply.code(status).send({ error: result.message });
      }
      return result;
    },
  );

  // Fetch the suggested form previously generated for a submission (consumed by
  // the create-coverage page to render the dynamic, AI-suggested form).
  app.get<{ Params: { submissionId: string } }>(
    '/pipeline/schemaGeneration/:submissionId',
    { schema: { params: { type: 'object', properties: { submissionId: { type: 'string' } }, required: ['submissionId'] } } },
    async (request, reply) => {
      const suggested = await loadSuggestedForm(Number(request.params.submissionId));
      if (!suggested) return reply.code(404).send({ error: 'No suggested form for this submission' });
      return suggested;
    },
  );

  app.post(
    '/pipeline/schemaGeneration/process',
    { schema: { description: 'Generate a suggested submission form', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } },
    async (request) => {
      const svc = new SchemaGenerationService();
      return svc.process(request.body);
    },
  );
};
