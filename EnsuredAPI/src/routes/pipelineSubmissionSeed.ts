import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../db/models';
import { PipelineSubmissionSeedService } from '../services/PipelineSubmissionSeedService';
import { SCENARIO_KEYS, type SubmissionScenarioKey } from '../services/submissionScenarios';
import { SUBMISSION_TYPE_CODES } from '../db/seed-data/submissionTypeTaxonomy';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

const service = new PipelineSubmissionSeedService();

export const pipelineSubmissionSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/pipeline-submissions',
    {
      schema: {
        description:
          "Seed incoming submissions into the calling user's organization so the ingestion pipeline can be tested manually on the Pipeline Processes board.",
        body: {
          type: 'object',
          properties: {
            count: { type: 'integer', minimum: 1, maximum: 50, default: 3 },
            ensureSubscriptions: { type: 'boolean', default: true },
            attachDocuments: { type: 'boolean', default: true },
            scenario: {
              type: 'string',
              enum: ['weighted', ...SCENARIO_KEYS],
              default: 'weighted',
              description:
                "Business scenario to seed. 'weighted' (default) draws the standard mix; a specific key seeds the whole batch as that scenario.",
            },
            submissionType: {
              type: 'string',
              enum: ['auto', ...SUBMISSION_TYPE_CODES],
              default: 'auto',
              description:
                "Pin the transaction type for the batch so each card is unambiguously a new-business / renewal / quote-request / endorsement / claim / … submission in the pipeline. 'auto' (default) leaves the type to the submissionType stage.",
            },
          },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const authHeader =
        (request.headers.authorization as string) || (request.headers.Authorization as string | undefined);
      if (!authHeader) return reply.code(401).send({ error: 'missing_authorization' });
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) return reply.code(401).send({ error: 'invalid_authorization' });

      let payload: any;
      try {
        payload = jwt.verify(match[1], JWT_SECRET);
      } catch (err) {
        return reply.code(401).send({ error: 'invalid_token' });
      }

      const userId = Number(payload?.userId ?? payload?.id ?? null);
      if (!userId) return reply.code(401).send({ error: 'invalid_token_payload' });

      const user = await User.findByPk(userId);
      if (!user) return reply.code(404).send({ error: 'user_not_found' });
      if (!user.organizationId) {
        return reply.code(422).send({
          error: 'organization_required',
          message:
            'The current user has no organization. Sign in (or impersonate) an insurer user before seeding submissions into the pipeline.',
        });
      }

      const body = (request.body ?? {}) as {
        count?: number;
        ensureSubscriptions?: boolean;
        attachDocuments?: boolean;
        scenario?: SubmissionScenarioKey | 'weighted';
        submissionType?: string;
      };

      try {
        const summary = await service.seedForOrganization(user.organizationId, user.id, {
          count: body.count,
          ensureSubscriptions: body.ensureSubscriptions,
          attachDocuments: body.attachDocuments,
          scenario: body.scenario,
          submissionType: body.submissionType,
        });
        return reply.code(201).send(summary);
      } catch (err: any) {
        request.log.error(err);
        return reply.code(500).send({ error: 'seed_failed', message: err?.message ?? String(err) });
      }
    },
  );

  app.post(
    '/seed/pipeline-flow',
    {
      schema: {
        description:
          "Simulate a multi-stage pipeline history for the org's existing submissions (no OCR/LLM run) so the board fans across lanes and the Pipeline Flow Sankey has real stage transitions to draw.",
        body: {
          type: 'object',
          properties: {
            reset: {
              type: 'boolean',
              default: true,
              description: 'Clear prior simulated (non-received) events first so repeated calls reset rather than pile up.',
            },
          },
        },
        response: { 201: { type: 'object', additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const authHeader =
        (request.headers.authorization as string) || (request.headers.Authorization as string | undefined);
      if (!authHeader) return reply.code(401).send({ error: 'missing_authorization' });
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) return reply.code(401).send({ error: 'invalid_authorization' });

      let payload: any;
      try {
        payload = jwt.verify(match[1], JWT_SECRET);
      } catch (err) {
        return reply.code(401).send({ error: 'invalid_token' });
      }

      const userId = Number(payload?.userId ?? payload?.id ?? null);
      if (!userId) return reply.code(401).send({ error: 'invalid_token_payload' });

      const user = await User.findByPk(userId);
      if (!user) return reply.code(404).send({ error: 'user_not_found' });
      if (!user.organizationId) {
        return reply.code(422).send({ error: 'organization_required' });
      }

      const body = (request.body ?? {}) as { reset?: boolean };
      try {
        const summary = await service.simulateFlowForOrganization(user.organizationId, { reset: body.reset });
        return reply.code(201).send(summary);
      } catch (err: any) {
        request.log.error(err);
        return reply.code(500).send({ error: 'simulate_failed', message: err?.message ?? String(err) });
      }
    },
  );
};

export default pipelineSubmissionSeedRoute;
