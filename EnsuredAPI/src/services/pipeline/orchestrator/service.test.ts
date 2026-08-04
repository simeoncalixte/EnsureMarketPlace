import { PipelineOrchestrator } from './service';

function job(overrides: Record<string, unknown> = {}) {
  const value: Record<string, any> = {
    submissionId: 41,
    organizationId: 9,
    stageKey: null,
    attemptCount: 0,
    maxAttempts: 3,
    update: jest.fn(async (patch: Record<string, unknown>) => Object.assign(value, patch)),
    ...overrides,
  };
  return value;
}

describe('PipelineOrchestrator', () => {
  const now = () => new Date('2026-07-20T12:00:00.000Z');

  it('advances a queued submission as the automatic worker and makes the next stage eligible', async () => {
    const commands = {
      advance: jest.fn(async () => ({
        ok: true,
        submissionId: 41,
        fromStage: 'ingestion',
        fromStageLabel: 'Ingestion',
        toStage: 'ocr',
        toStageLabel: 'OCR',
        eventStatus: 'ok' as const,
        error: null,
        warnings: [],
        runId: 7,
        routeKey: 'default',
      })),
      rerun: jest.fn(),
    };
    const worker = new PipelineOrchestrator({ commands, now, workerId: 'test-worker' });
    const queuedJob = job();

    await (worker as any).runClaimedJob(queuedJob);

    expect(commands.advance).toHaveBeenCalledWith(41, { organizationId: 9, userId: null }, { trigger: 'automatic' });
    expect(queuedJob.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'queued',
      stageKey: null,
      attemptCount: 0,
      lastError: null,
    }));
  });

  it('records the failed stage and retries that same stage instead of advancing past it', async () => {
    const commands = {
      advance: jest.fn(async () => ({
        ok: false,
        submissionId: 41,
        fromStage: 'ingestion',
        fromStageLabel: 'Ingestion',
        toStage: 'ocr',
        toStageLabel: 'OCR',
        eventStatus: 'failed' as const,
        error: 'provider unavailable',
        warnings: [],
        runId: 7,
        routeKey: 'default',
      })),
      rerun: jest.fn(),
    };
    const worker = new PipelineOrchestrator({ commands, now });
    const queuedJob = job();

    await (worker as any).runClaimedJob(queuedJob);

    expect(queuedJob.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'queued',
      stageKey: 'ocr',
      attemptCount: 1,
      lastError: 'provider unavailable',
    }));
  });

  it('uses rerun for a persisted failed-stage retry', async () => {
    const commands = {
      advance: jest.fn(),
      rerun: jest.fn(async () => ({ error: 'already_at_final_stage', code: 400 })),
    };
    const worker = new PipelineOrchestrator({ commands, now });
    const queuedJob = job({ stageKey: 'ocr' });

    await (worker as any).runClaimedJob(queuedJob);

    expect(commands.rerun).toHaveBeenCalledWith(41, { organizationId: 9, userId: null }, { stageKey: 'ocr', trigger: 'automatic' });
    expect(queuedJob.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });
});
