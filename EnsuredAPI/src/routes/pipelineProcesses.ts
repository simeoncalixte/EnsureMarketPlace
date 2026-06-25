import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { readdir, readFile } from 'fs/promises';
import jwt from 'jsonwebtoken';
import path from 'path';
import { PipelineArtifact, SubmissionFile } from '../db/models';
import { User } from '../db/models/identity.models';
import { PipelineLifecycleSubscription } from '../db/models/pipelineConfig.models';
import { advanceSubmissionToNextStage, rerunSubmissionStage, buildPipelineBoard, buildPipelineFlow } from '../pipeline/board/service';
import { getArtifact, getSubmissionAgentActivity, getSubmissionPlayback } from '../pipeline/playback/service';
import { PIPELINE_OPERATION_KEYS } from '../pipeline/operations/catalog';
import { getS3Object } from '../pipeline/connectors/s3';

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

/** Browser-renderable MIME type per file extension; octet-stream otherwise. */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  // Text-ish formats are served as plain text so inline previews are safe
  // (no HTML/script execution) and render in a plain frame.
  txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  csv: 'text/plain; charset=utf-8',
  json: 'text/plain; charset=utf-8',
  eml: 'text/plain; charset=utf-8',
  html: 'text/plain; charset=utf-8',
  xml: 'text/plain; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
};

function mimeForFileName(fileName: string): string {
  const ext = path.extname(fileName).replace('.', '').toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/** Read a stored submission file from local disk or s3://bucket/key. */
async function readSubmissionFileContent(storagePath: string): Promise<Buffer | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith('s3://')) {
    const s = storagePath.replace('s3://', '');
    const idx = s.indexOf('/');
    if (idx <= 0) return null;
    return getS3Object(s.slice(0, idx), s.slice(idx + 1));
  }
  try {
    return await readFile(storagePath);
  } catch {
    return null;
  }
}

/**
 * Per-file extracted-text previews from the submission's latest OCR output
 * artifact, keyed by file name. This is what lets the UI present a preview for
 * EVERY file type: formats a browser cannot render inline (docx, xlsx, …)
 * fall back to the text the OCR stage already extracted.
 */
async function loadOcrTextPreviews(submissionId: number): Promise<Map<string, { textPreview: string; textLength: number }>> {
  const previews = new Map<string, { textPreview: string; textLength: number }>();
  try {
    const artifact = await PipelineArtifact.findOne({
      where: { submissionId, stageKey: 'ocr', role: 'output' },
      order: [['id', 'DESC']],
    });
    const payload = (artifact?.payload ?? {}) as Record<string, unknown>;
    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    for (const doc of documents) {
      const d = (doc ?? {}) as Record<string, unknown>;
      const fileName = typeof d.fileName === 'string' ? d.fileName : null;
      const textPreview = typeof d.textPreview === 'string' ? d.textPreview : '';
      if (fileName && textPreview) {
        previews.set(fileName, { textPreview, textLength: Number(d.textLength) || textPreview.length });
      }
    }
  } catch {
    // Previews are an enhancement — a missing artifact never breaks the listing.
  }
  return previews;
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
        description: 'Active submissions grouped into pipeline processing stages (Kanban board). Pass ?type=<submissionTypeCode> to scope the board to one submission-type route.',
        querystring: {
          type: 'object',
          properties: { type: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const type = (request.query as { type?: string } | undefined)?.type ?? null;
      return reply.code(200).send(await buildPipelineBoard(request, { type }));
    },
  );

  app.get(
    '/pipeline/processes/flow',
    {
      schema: {
        description: 'Complete-pipeline flow (Sankey): forward stage-transition counts across the org\'s submissions, derived from their IngestionEvent history.',
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    },
    async (request, reply) => reply.code(200).send(await buildPipelineFlow(request)),
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
    '/pipeline/processes/submissions/:id/agent-activity',
    {
      schema: {
        description:
          'The AI-agent transcript for a submission: every LLM call made while processing it (the exact prompt sent and the raw model response), including calls of any stage currently in flight. Poll while `active` is true to watch a running stage.',
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
      return reply.code(200).send(await getSubmissionAgentActivity(Number(id)));
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
    '/pipeline/processes/submissions/:id/files',
    {
      schema: {
        description:
          'List the files attached to a submission, each with a content URL for inline preview and (when OCR has run) an extracted-text preview usable for any file type.',
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
      const submissionId = Number(id);
      const [files, previews] = await Promise.all([
        SubmissionFile.findAll({ where: { submissionId }, order: [['id', 'ASC']] }),
        loadOcrTextPreviews(submissionId),
      ]);
      return reply.code(200).send({
        submissionId,
        files: files.map((file) => {
          const fileName = String(file.get('fileName') ?? 'document');
          const preview = previews.get(fileName) ?? null;
          return {
            id: file.id,
            fileName,
            fileType: file.get('fileType') ?? null,
            mimeType: mimeForFileName(fileName),
            fileSize: file.get('fileSize') ?? null,
            uploadedAt: file.get('uploadedAt') ?? null,
            contentUrl: `/api/pipeline/processes/files/${file.id}/content`,
            textPreview: preview?.textPreview ?? null,
            textLength: preview?.textLength ?? null,
          };
        }),
      });
    },
  );

  app.get(
    '/pipeline/processes/files/:fileId/content',
    {
      schema: {
        description: 'Stream a submission file inline (correct MIME type) so the UI can preview it.',
        params: {
          type: 'object',
          required: ['fileId'],
          properties: { fileId: { type: 'integer' } },
        },
      },
    },
    async (request, reply) => {
      const { fileId } = request.params as { fileId: number };
      const file = await SubmissionFile.findByPk(Number(fileId));
      if (!file) {
        return reply.code(404).send({ error: 'file_not_found' });
      }
      const content = await readSubmissionFileContent(String(file.get('storagePath') ?? ''));
      if (!content) {
        return reply.code(404).send({ error: 'file_content_unavailable' });
      }
      const fileName = String(file.get('fileName') ?? 'document');
      return reply
        .code(200)
        .header('Content-Type', mimeForFileName(fileName))
        .header('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`)
        .send(content);
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
