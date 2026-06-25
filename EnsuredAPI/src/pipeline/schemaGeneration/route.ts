import { FastifyPluginAsync } from 'fastify';
import { SchemaGenerationService, buildBaselineForm, loadOptionSet, loadSuggestedForm } from './service';

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

  // The deterministic baseline form, optionally tailored by line of business /
  // portfolio size. Rendered by the create-coverage page until the agent has
  // tailored a form for a specific submission. (Static route — resolves ahead of
  // the `/:submissionId` param route below.)
  app.get<{ Querystring: { lineOfBusinessCode?: string; lineOfBusinessLabel?: string; subjectCount?: string } }>(
    '/pipeline/schemaGeneration/baseline',
    { schema: { querystring: { type: 'object', additionalProperties: true } } },
    async (request) => {
      const { lineOfBusinessCode, lineOfBusinessLabel, subjectCount } = request.query;
      const count = subjectCount !== undefined && subjectCount !== '' ? Number(subjectCount) : null;
      return buildBaselineForm({
        lineOfBusinessCode: lineOfBusinessCode ?? null,
        lineOfBusinessLabel: lineOfBusinessLabel ?? null,
        subjectCount: Number.isFinite(count as number) ? (count as number) : null,
      });
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
