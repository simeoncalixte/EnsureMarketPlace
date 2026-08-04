import { FastifyPluginAsync } from 'fastify';
import { Submission } from '../../db/models';
import {
  CatScoreValidationError,
  type CreateCatAssessmentInput,
  createSubmissionCatAssessment,
  listSubmissionCatAssessments,
} from './catScores.service';

/**
 * CAT assessment routes scoped to a submission.
 *
 * Read path: list stored CAT assessments + peril-level score details.
 * Write path: create an assessment with service-layer CAT-peril validation.
 */

function parseSubmissionId(raw: unknown): number {
  const id = Number(raw);
  return Number.isFinite(id) ? id : 0;
}

export const catScoreRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/submissions/:submissionId/cat-risk-assessments',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List catastrophe risk assessments for a submission',
        params: {
          type: 'object',
          properties: {
            submissionId: { type: 'integer' },
          },
          required: ['submissionId'],
        },
        response: {
          200: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    async (request, reply) => {
      const submissionId = parseSubmissionId((request.params as { submissionId?: number }).submissionId);
      if (!submissionId) {
        return reply.code(400).send({ error: 'invalid_submission_id' });
      }

      const exists = await Submission.findByPk(submissionId);
      if (!exists) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      const items = await listSubmissionCatAssessments(submissionId);
      return reply.code(200).send(items);
    },
  );

  app.post(
    '/marketplace/submissions/:submissionId/cat-risk-assessments',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Create a catastrophe risk assessment for a submission',
        params: {
          type: 'object',
          properties: {
            submissionId: { type: 'integer' },
          },
          required: ['submissionId'],
        },
        body: {
          type: 'object',
          required: ['scores'],
          properties: {
            assessmentExternalId: { type: 'string' },
            subjectType: { type: 'string' },
            subjectId: { type: 'string' },
            assessmentDate: { type: 'string', format: 'date' },
            currency: { type: 'string' },
            inputExposureSnapshotId: { type: 'string' },
            scores: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['peril', 'value'],
                properties: {
                  peril: { type: 'string' },
                  value: { type: 'number' },
                  scaleMin: { type: 'number' },
                  scaleMax: { type: 'number' },
                  direction: { type: 'string', enum: ['higher_is_riskier', 'lower_is_riskier'] },
                  band: { type: 'string' },
                  percentile: { type: 'number' },
                  scoreType: { type: 'string' },
                  primaryMetric: { type: 'string' },
                  financialPerspective: { type: 'string' },
                  exposureBasis: { type: 'string' },
                  modelVendor: { type: 'string' },
                  modelName: { type: 'string' },
                  modelVersion: { type: 'string' },
                  eventCatalogVersion: { type: 'string' },
                  runId: { type: 'string' },
                  recommendedAction: { type: 'string' },
                  confidence: { type: 'string' },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
        response: {
          201: { type: 'object' },
        },
      },
    },
    async (request, reply) => {
      const submissionId = parseSubmissionId((request.params as { submissionId?: number }).submissionId);
      if (!submissionId) {
        return reply.code(400).send({ error: 'invalid_submission_id' });
      }

      const exists = await Submission.findByPk(submissionId);
      if (!exists) {
        return reply.code(404).send({ error: 'submission_not_found' });
      }

      try {
        const created = await createSubmissionCatAssessment(submissionId, request.body as CreateCatAssessmentInput);
        return reply.code(201).send(created);
      } catch (error) {
        if (error instanceof CatScoreValidationError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};

export default catScoreRoutes;
