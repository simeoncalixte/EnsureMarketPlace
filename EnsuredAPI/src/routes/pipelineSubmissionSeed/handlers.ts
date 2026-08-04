import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../../db/models';
import { PipelineSubmissionSeedService } from '../../services/PipelineSubmissionSeedService';
import { type SubmissionScenarioKey } from '../../services/submissionScenarios';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

const service = new PipelineSubmissionSeedService();

export async function seedPipelineSubmissionsHandler(request: FastifyRequest, reply: FastifyReply) {
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
}

export async function seedPipelineFlowHandler(request: FastifyRequest, reply: FastifyReply) {
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
}
