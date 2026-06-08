import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { readdir, readFile } from 'fs/promises';
import jwt from 'jsonwebtoken';
import path from 'path';
import { User } from '../db/models/identity.models';
import { PipelineLifecycleSubscription } from '../db/models/pipelineConfig.models';
import { advanceSubmissionToNextStage, rerunSubmissionStage, buildPipelineBoard } from '../pipeline/board/service';
import { getArtifact, getSubmissionPlayback } from '../pipeline/playback/service';
import { PIPELINE_OPERATION_KEYS } from '../pipeline/operations/catalog';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

type PipelineTransformation = {
  process?: string;
  stage?: string;
  testName?: string;
  description?: string;
  before?: unknown;
  after?: unknown;
  recordedAt?: string;
};

type PipelineProcessReport = {
  process: string;
  generatedAt?: string;
  transformationCount: number;
  transformations: PipelineTransformation[];
};

type BaseLifecycleReport = {
  generatedAt?: string;
  testFile?: string;
  submissionId?: number | string;
  transformationCount: number;
  transformations: PipelineTransformation[];
};

type PipelineProcessesRouteOptions = {
  reportDir?: string;
  baseReportPath?: string;
};

type PipelineLifecycleSubscriptionResponse = {
  eventKey: string;
  organizationId: number;
  process: string;
  stage: string;
  enabled: boolean;
};

// Execution order derives from the single canonical operation registry
// (src/pipeline/operations/catalog.ts) so a new module can never drift out of sync.
const processOrder = PIPELINE_OPERATION_KEYS;

function defaultReportDir(): string {
  return path.resolve(process.cwd(), 'test-results', 'pipeline-process-transformations');
}

function defaultBaseReportPath(): string {
  return path.resolve(process.cwd(), 'test-results', 'base-pipeline-transformations.json');
}

function getProcessSortIndex(processName: string): number {
  const index = processOrder.indexOf(processName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function normalizeReport(raw: unknown, fallbackProcess: string): PipelineProcessReport {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const transformations = Array.isArray(candidate.transformations)
    ? candidate.transformations as PipelineTransformation[]
    : [];
  const processName = typeof candidate.process === 'string' ? candidate.process : fallbackProcess;
  const transformationCount = typeof candidate.transformationCount === 'number'
    ? candidate.transformationCount
    : transformations.length;

  return {
    process: processName,
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : undefined,
    transformationCount,
    transformations,
  };
}

function normalizeBaseLifecycle(raw: unknown): BaseLifecycleReport | null {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const transformations = Array.isArray(candidate.transformations)
    ? candidate.transformations as PipelineTransformation[]
    : [];

  if (transformations.length === 0) {
    return null;
  }

  return {
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : undefined,
    testFile: typeof candidate.testFile === 'string' ? candidate.testFile : undefined,
    submissionId: typeof candidate.submissionId === 'number' || typeof candidate.submissionId === 'string'
      ? candidate.submissionId
      : undefined,
    transformationCount: typeof candidate.transformationCount === 'number'
      ? candidate.transformationCount
      : transformations.length,
    transformations,
  };
}

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents) as unknown;
  } catch (error) {
    return null;
  }
}

async function resolveAuthenticatedUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
  const authHeader = (request.headers.authorization as string) || request.headers.Authorization as string | undefined;
  if (!authHeader) {
    reply.code(401).send({ error: 'missing_authorization' });
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    reply.code(401).send({ error: 'invalid_authorization' });
    return null;
  }

  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as { userId?: unknown; id?: unknown };
    const userId = payload.userId ?? payload.id ?? null;
    if (!userId) {
      reply.code(401).send({ error: 'invalid_token_payload' });
      return null;
    }

    const user = await User.findByPk(Number(userId));
    if (!user) {
      reply.code(404).send({ error: 'user_not_found' });
      return null;
    }

    return user;
  } catch (error) {
    reply.code(401).send({ error: 'invalid_token' });
    return null;
  }
}

function serializeSubscription(subscription: PipelineLifecycleSubscription): PipelineLifecycleSubscriptionResponse {
  return {
    eventKey: subscription.eventKey,
    organizationId: subscription.organizationId,
    process: subscription.process,
    stage: subscription.stage,
    enabled: subscription.enabled,
  };
}

function readStringField(body: Record<string, unknown>, fieldName: string): string | null {
  const value = body[fieldName];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export const pipelineProcessesRoute: FastifyPluginAsync<PipelineProcessesRouteOptions> = async (app, options) => {
  app.get(
    '/pipeline/processes',
    {
      schema: {
        description: 'List generated pipeline process transformation reports',
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async () => {
      const reportDir = options.reportDir ?? defaultReportDir();
      const baseReportPath = options.baseReportPath ?? defaultBaseReportPath();
      const fileNames = await readdir(reportDir).catch(() => [] as string[]);
      const reports = await Promise.all(
        fileNames
          .filter((fileName) => fileName.endsWith('.json'))
          .map(async (fileName) => {
            const raw = await readJsonFile(path.join(reportDir, fileName));
            return normalizeReport(raw, path.basename(fileName, '.json'));
          }),
      );

      const baseLifecycleRaw = await readJsonFile(baseReportPath);

      return {
        generatedAt: new Date().toISOString(),
        source: reportDir,
        reports: reports.sort((a, b) => {
          const orderDelta = getProcessSortIndex(a.process) - getProcessSortIndex(b.process);
          return orderDelta === 0 ? a.process.localeCompare(b.process) : orderDelta;
        }),
        baseLifecycle: normalizeBaseLifecycle(baseLifecycleRaw),
      };
    },
  );

  app.get(
    '/pipeline/processes/board',
    {
      schema: {
        description: 'Active submissions grouped into pipeline processing stages (Kanban board).',
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => reply.code(200).send(await buildPipelineBoard(request)),
  );

  app.post(
    '/pipeline/processes/submissions/:id/advance',
    {
      schema: {
        description: 'Manually run the next pipeline stage for a submission and record the transition.',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const result = await advanceSubmissionToNextStage(Number(id));
      if ('code' in result) {
        return reply.code(result.code).send({ error: result.error });
      }
      return reply.code(200).send(result);
    },
  );

  app.post(
    '/pipeline/processes/submissions/:id/rerun',
    {
      schema: {
        description: 'Re-run a pipeline stage for a submission (defaults to the current/failed stage) and record the attempt.',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { stageKey: { type: 'string' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const { stageKey } = (request.body ?? {}) as { stageKey?: string };
      const result = await rerunSubmissionStage(Number(id), { stageKey });
      if ('code' in result) {
        return reply.code(result.code).send({ error: result.error });
      }
      return reply.code(200).send(result);
    },
  );

  app.get(
    '/pipeline/processes/submissions/:id/runs',
    {
      schema: {
        description:
          'Replayable history for a submission: pipeline runs, each with its ordered stage executions and input/output artifact summaries. Fetch a payload via /pipeline/processes/artifacts/:artifactId.',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      return reply.code(200).send(await getSubmissionPlayback(Number(id)));
    },
  );

  app.get(
    '/pipeline/processes/artifacts/:artifactId',
    {
      schema: {
        description:
          'Fetch a single pipeline artifact — the captured input or output payload of a stage execution — for playback / re-run.',
        params: {
          type: 'object',
          required: ['artifactId'],
          properties: { artifactId: { type: 'integer' } },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          404: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const { artifactId } = request.params as { artifactId: number };
      const artifact = await getArtifact(Number(artifactId));
      if (!artifact) {
        return reply.code(404).send({ error: 'artifact_not_found' });
      }
      return reply.code(200).send({
        id: artifact.id,
        runId: artifact.runId,
        submissionId: artifact.submissionId,
        stageKey: artifact.stageKey,
        role: artifact.role,
        contentHash: artifact.contentHash,
        mediaType: artifact.mediaType,
        sizeBytes: artifact.sizeBytes,
        payload: artifact.payload,
        createdAt: artifact.createdAt,
      });
    },
  );

  app.get(
    '/pipeline/processes/subscriptions',
    {
      schema: {
        description: 'List current organization pipeline lifecycle event subscriptions',
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const user = await resolveAuthenticatedUser(request, reply);
      if (!user) return reply;
      if (!user.organizationId) {
        return reply.code(403).send({ error: 'organization_required' });
      }

      const subscriptions = await PipelineLifecycleSubscription.findAll({
        where: { organizationId: user.organizationId },
        order: [['eventKey', 'ASC']],
      });

      return {
        subscriptions: subscriptions.map(serializeSubscription),
      };
    },
  );

  app.post(
    '/pipeline/processes/subscriptions',
    {
      schema: {
        description: 'Subscribe or unsubscribe the current organization from a pipeline lifecycle event',
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
          400: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const user = await resolveAuthenticatedUser(request, reply);
      if (!user) return reply;
      if (!user.organizationId) {
        return reply.code(403).send({ error: 'organization_required' });
      }

      const body = request.body && typeof request.body === 'object'
        ? request.body as Record<string, unknown>
        : {};
      const eventKey = readStringField(body, 'eventKey');
      const processName = readStringField(body, 'process');
      const stage = readStringField(body, 'stage');
      const enabled = body.enabled;

      if (!eventKey || !processName || !stage || typeof enabled !== 'boolean') {
        return reply.code(400).send({
          error: 'invalid_subscription_payload',
          message: 'eventKey, process, stage, and enabled are required.',
        });
      }

      const [subscription, created] = await PipelineLifecycleSubscription.findOrCreate({
        where: { organizationId: user.organizationId, eventKey },
        defaults: {
          organizationId: user.organizationId,
          eventKey,
          process: processName,
          stage,
          enabled,
        },
      });

      if (!created) {
        await subscription.update({
          process: processName,
          stage,
          enabled,
        });
      }

      return {
        subscription: serializeSubscription(subscription),
      };
    },
  );
};
