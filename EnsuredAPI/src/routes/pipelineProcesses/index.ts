import { FastifyPluginAsync } from 'fastify';
import { readdir } from 'fs/promises';
import path from 'path';
import { SubmissionFile } from '../../db/models';
import { PipelineLifecycleSubscription } from '../../db/models/pipelineConfig.models';
import { buildPipelineBoard, buildPipelineFlow } from '../../services/pipeline/board/service';
import { PipelineCommandService } from '../../services/pipeline/commands/service';
import { getArtifact, getSubmissionAgentActivity, getSubmissionPlayback } from '../../services/pipeline/playback/service';
import {
  defaultBaseReportPath,
  defaultReportDir,
  getProcessSortIndex,
  loadOcrTextPreviews,
  mimeForFileName,
  normalizeBaseLifecycle,
  normalizeReport,
  readJsonFile,
  readStringField,
  readSubmissionFileContent,
  resolveAuthenticatedUser,
  serializeSubscription,
} from './service';
import { PipelineProcessesRouteOptions } from './types';

export type { PipelineProcessesRouteOptions } from './types';

export const pipelineProcessesRoute: FastifyPluginAsync<PipelineProcessesRouteOptions> = async (app, options) => {
  const commands = new PipelineCommandService();
  const authorizePipelineAccess = async (request: any, reply: any) => {
    const user = await resolveAuthenticatedUser(request, reply);
    if (!user) return null;
    const organizationId = Number(user.organizationId ?? 0);
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      reply.code(403).send({ error: 'organization_membership_required' });
      return null;
    }
    return { userId: user.id, organizationId };
  };
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
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
    async (request, reply) => {
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      return reply.code(200).send(await buildPipelineFlow(request));
    },
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { id } = request.params as { id: number };
      const result = await commands.advance(Number(id), access);
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { id } = request.params as { id: number };
      const { stageKey } = (request.body ?? {}) as { stageKey?: string };
      const result = await commands.rerun(Number(id), access, { stageKey });
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { id } = request.params as { id: number };
      return reply.code(200).send(await getSubmissionPlayback(Number(id), access.organizationId));
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { id } = request.params as { id: number };
      return reply.code(200).send(await getSubmissionAgentActivity(Number(id), access.organizationId));
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { artifactId } = request.params as { artifactId: number };
      const artifact = await getArtifact(Number(artifactId), access.organizationId);
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { id } = request.params as { id: number };
      const submissionId = Number(id);
      const [files, previews] = await Promise.all([
        SubmissionFile.findAll({ where: { submissionId, organizationId: access.organizationId }, order: [['id', 'ASC']] }),
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
      const access = await authorizePipelineAccess(request, reply);
      if (!access) return reply;
      const { fileId } = request.params as { fileId: number };
      const file = await SubmissionFile.findOne({ where: { id: Number(fileId), organizationId: access.organizationId } });
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
