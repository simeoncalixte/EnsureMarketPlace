import { getSequelize } from '../config/database';
import {
  IngestionChannel,
  Submission,
  CanonicalSubmission,
  IngestionEvent,
} from '../db/models';
import { ClassificationService } from './classification/service';
import { OcrService } from './ocr/service';
import { ExtractionService } from './extraction/service';
import { NormalizationService } from './normalization/service';
import { ValidationService } from './validation/service';
import { WorkflowService } from './workflow/service';
import { StorageSearchService } from './storageSearch/service';
import { getStrategyForChannel } from './strategies';

type RunnerHandle = {
  stop: () => Promise<void>;
};

// Process a single submission through the pipeline stages. Returns 1 if processed, 0 if skipped.
export async function processSubmission(submission: any): Promise<{ submissionId: number; ok: boolean; error?: string } > {
  const submissionId = submission.id;
  try {
    await IngestionEvent.create({ submissionId, stage: 'start', status: 'processing', metadata: { note: 'begin pipeline' } });

    const classification = await new ClassificationService().process({ submission });
    await IngestionEvent.create({ submissionId, stage: 'classification', status: 'completed', metadata: { classification } });

    const ocr = await new OcrService().process({ submission });
    await IngestionEvent.create({ submissionId, stage: 'ocr', status: 'completed', metadata: { ocr } });

    const extraction = await new ExtractionService().process({ submission, ocr });
    await IngestionEvent.create({ submissionId, stage: 'extraction', status: 'completed', metadata: { extraction } });

    const normalization = await new NormalizationService().process({ extraction });
    await IngestionEvent.create({ submissionId, stage: 'normalization', status: 'completed', metadata: { normalization } });

    const validation = await new ValidationService().process({ normalization });
    await IngestionEvent.create({ submissionId, stage: 'validation', status: 'completed', metadata: { validation } });

    const workflow = await new WorkflowService().process({ submission, validation });
    await IngestionEvent.create({ submissionId, stage: 'workflow', status: 'completed', metadata: { workflow } });

    const storage = await new StorageSearchService().process({ submission, data: normalization });
    await IngestionEvent.create({ submissionId, stage: 'storage', status: 'completed', metadata: { storage } });

    const canonicalData = {
      submissionId,
      classification,
      ocr,
      extraction,
      normalization,
      validation,
      workflow,
      storage,
      processedAt: new Date().toISOString(),
    };

    const existing = await CanonicalSubmission.findOne({ where: { submissionId } });
    if (existing) {
      existing.data = canonicalData as any;
      existing.version = (existing.version ?? 1) + 1;
      await existing.save();
    } else {
      await CanonicalSubmission.create({ submissionId, tenantId: submission.tenantId ?? null, data: canonicalData });
    }

    try {
      submission.status = 'modeling';
      await submission.save();
    } catch (_) {
      // non-fatal
    }

    await IngestionEvent.create({ submissionId, stage: 'end', status: 'completed', metadata: { canonicalData } });
    return { submissionId, ok: true };
  } catch (err: any) {
    await IngestionEvent.create({ submissionId, stage: 'error', status: 'failed', errorMessage: err?.message ?? String(err), metadata: { error: String(err) } });
    console.error('Pipeline error for submission', submissionId, err);
    return { submissionId, ok: false, error: err?.message ?? String(err) };
  }
}

// Process a single channel; returns number of submissions processed
export async function processChannel(channel: typeof IngestionChannel.prototype, batchSize = 10): Promise<{ channelId: number; label?: string; processedCount: number; results: Array<{ submissionId: number; ok: boolean; error?: string; skipped?: boolean }> }> {
  const channelId = (channel as any).id;
  const label = (channel.get('label') as string) ?? undefined;
  const results: Array<{ submissionId: number; ok: boolean; error?: string; skipped?: boolean }> = [];
  try {
    await channel.update({ status: 'running' });
    const where: Record<string, unknown> = { status: 'submitted' };
    // Resolve organization id for this channel (support legacy tenantId)
    const channelOrgId = (channel && typeof (channel as any).get === 'function')
      ? ((channel.get('organizationId') as number) ?? (channel.get('tenantId') as number) ?? (channel as any).tenantId ?? null)
      : ((channel as any).tenantId ?? null);
    if (channelOrgId != null) where['tenantId'] = channelOrgId;
    if ((channel as any).type) where['source'] = (channel as any).type;

    const submissions = await Submission.findAll({ where, order: [['id', 'ASC']], limit: batchSize });
    for (const s of submissions) {
      const submissionId = (s as any).id;
      const exists = await CanonicalSubmission.findOne({ where: { submissionId } });
      if (exists) {
        results.push({ submissionId, ok: false, skipped: true });
        continue; // already processed
      }
      // eslint-disable-next-line no-await-in-loop
      const res = await processSubmission(s);
      results.push(res);
    }
  } catch (err: any) {
    console.error('Error processing channel', channelId, err);
  } finally {
    try {
      await channel.update({ status: 'idle' });
    } catch (_) {
      // ignore
    }
  }
  const processedCount = results.filter((r) => r.ok === true).length;
  return { channelId, label, processedCount, results };
}

// Run a single poll across enabled channels. Returns summary info.
export async function runPipelineOnce(options?: { batchSize?: number }) {
  try {
    getSequelize();
    const batchSize = options?.batchSize ?? Number(process.env.PIPELINE_BATCH_SIZE ?? '10');
    const channels = await IngestionChannel.findAll({ where: { enabled: true }, order: [['id', 'ASC']] });
    const channelSummaries: Array<{ channelId: number; label?: string; processedCount: number; results: Array<{ submissionId: number; ok: boolean; error?: string; skipped?: boolean }>; createdCount?: number }> = [];
    for (const ch of channels) {
        // serial processing to keep it simple
        // ensure we create any new submissions for this channel using the configured strategy
        try {
          const strategy = getStrategyForChannel(ch as any);
          const createdCount = await strategy.ensureSubmissions(ch as any, batchSize);
          // eslint-disable-next-line no-await-in-loop
          const summary = await processChannel(ch, batchSize);
          channelSummaries.push({ ...summary, createdCount });
        } catch (e) {
          console.error('Error ensuring submissions or processing channel', (ch as any).id, e);
          // fallback: still attempt to process existing submissions
          // eslint-disable-next-line no-await-in-loop
          const summary = await processChannel(ch, batchSize);
          channelSummaries.push(summary);
        }
    }
    const channelsProcessed = channelSummaries.length;
    const submissionsProcessed = channelSummaries.reduce((acc, s) => acc + (s.processedCount ?? 0), 0);
    return { channelsProcessed, submissionsProcessed, channels: channelSummaries };
  } catch (err) {
    console.error('Pipeline run error', err);
    throw err;
  }
}

export function startPipelineProcessor(options?: { intervalMs?: number; batchSize?: number }): RunnerHandle {
  const intervalMs = options?.intervalMs ?? Number(process.env.PIPELINE_POLL_INTERVAL_MS ?? '15000');
  const batchSize = options?.batchSize ?? 10;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  async function pollOnce() {
    try {
      await runPipelineOnce({ batchSize });
    } catch (err) {
      console.error('Pipeline poll error', err);
    }
  }

  // Start immediately and schedule
  pollOnce().catch((e) => console.error('initial pipeline poll failed', e));
  timer = setInterval(() => {
    if (stopped) return;
    // fire-and-forget but catch inside
    pollOnce().catch((e) => console.error('pipeline poll failed', e));
  }, intervalMs);

  return {
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
