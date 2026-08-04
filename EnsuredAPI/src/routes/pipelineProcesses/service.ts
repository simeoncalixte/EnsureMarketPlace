import { FastifyReply, FastifyRequest } from 'fastify';
import { readFile } from 'fs/promises';
import jwt from 'jsonwebtoken';
import path from 'path';
import { PipelineArtifact } from '../../db/models';
import { User } from '../../db/models/identity.models';
import { PipelineLifecycleSubscription } from '../../db/models/pipelineConfig.models';
import { PIPELINE_OPERATION_KEYS } from '../../services/pipeline/operations/catalog';
import { getS3Object } from '../../services/pipeline/connectors/s3';
import {
  BaseLifecycleReport,
  PipelineLifecycleSubscriptionResponse,
  PipelineProcessReport,
  PipelineTransformation,
} from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

// Execution order derives from the single canonical operation registry
// (src/pipeline/operations/catalog.ts) so a new module can never drift out of sync.
const processOrder = PIPELINE_OPERATION_KEYS;

export function defaultReportDir(): string {
  return path.resolve(process.cwd(), 'test-results', 'pipeline-process-transformations');
}

export function defaultBaseReportPath(): string {
  return path.resolve(process.cwd(), 'test-results', 'base-pipeline-transformations.json');
}

export function getProcessSortIndex(processName: string): number {
  const index = processOrder.indexOf(processName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function normalizeReport(raw: unknown, fallbackProcess: string): PipelineProcessReport {
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

export function normalizeBaseLifecycle(raw: unknown): BaseLifecycleReport | null {
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

export async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents) as unknown;
  } catch (error) {
    return null;
  }
}

export async function resolveAuthenticatedUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
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

export function serializeSubscription(subscription: PipelineLifecycleSubscription): PipelineLifecycleSubscriptionResponse {
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

export function mimeForFileName(fileName: string): string {
  const ext = path.extname(fileName).replace('.', '').toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/** Read a stored submission file from local disk or s3://bucket/key. */
export async function readSubmissionFileContent(storagePath: string): Promise<Buffer | null> {
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
export async function loadOcrTextPreviews(submissionId: number): Promise<Map<string, { textPreview: string; textLength: number }>> {
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

export function readStringField(body: Record<string, unknown>, fieldName: string): string | null {
  const value = body[fieldName];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
