import jwt from 'jsonwebtoken';
import { buildApp } from '../../app';
import { initTestDb } from '../../../test/helpers/db';
import { User } from '../../db/models/identity.models';
import { IngestionChannel, IngestionEvent, Submission } from '../../db/models';
import { PipelineLifecycleSubscription } from '../../db/models/pipelineConfig.models';

// Includes the Slice 5.4 additive 'riskCompute' (Pricing) lane appended after
// 'workflow'. The board's lane catalog grew by one; every prior lane is unchanged
// in order and key.
const PIPELINE_STAGE_KEYS = ['ingestion', 'ocr', 'classification', 'extraction', 'locationDiscovery', 'normalization', 'validation', 'schemaGeneration', 'workflow', 'riskCompute'];

// Full schema sync + reinsurance seed per test runs well past Jest's 5s default.
jest.setTimeout(60000);

describe('GET /api/pipeline/processes/board', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedAndSignToken() {
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 4, policyCount: 6, exposuresPerPolicy: 2, tranchesPerDeal: 3 },
    });

    expect(seedRes.statusCode).toBe(201);
    const summary = JSON.parse(seedRes.payload) as { batchId: string };

    const underwriter = await User.findOne({ where: { email: `underwriter.${summary.batchId}@ensured.local` } });
    expect(underwriter).not.toBeNull();

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
    const token = jwt.sign({ userId: underwriter!.id }, secret);

    return { token, organizationId: underwriter!.organizationId ?? null };
  }

  function getBoard(token?: string) {
    return app.inject({
      method: 'GET',
      url: '/api/pipeline/processes/board',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  async function subscribeToStages(organizationId: number, keys: string[]) {
    for (const key of keys) {
      await PipelineLifecycleSubscription.create({
        organizationId,
        eventKey: key,
        process: key,
        stage: key,
        enabled: true,
      } as never);
    }
  }

  it('falls back to all pipeline lanes when the request is unauthenticated', async () => {
    await seedAndSignToken(); // seed data, but query the board without a token

    const response = await getBoard();
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { config: { stages: Array<{ key: string }> } };
    expect(body.config.stages.map((stage) => stage.key)).toEqual(PIPELINE_STAGE_KEYS);
  });

  it('shows no lanes when the organization has not subscribed to any process', async () => {
    const { token } = await seedAndSignToken();

    const response = await getBoard(token);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { config: { stages: unknown[] }; items: unknown[] };
    expect(body.config.stages).toHaveLength(0);
    expect(body.items).toHaveLength(0);
  });

  it('shows only the stages the organization subscribed to (in canonical order)', async () => {
    const { token, organizationId } = await seedAndSignToken();
    await subscribeToStages(organizationId!, ['validation', 'ingestion']);

    const response = await getBoard(token);
    const body = JSON.parse(response.payload) as {
      config: { stages: Array<{ key: string }> };
      items: Array<{ stageKey: string; values: Record<string, unknown> }>;
    };

    // Filtered to the subscribed set, preserving canonical pipeline order.
    expect(body.config.stages.map((stage) => stage.key)).toEqual(['ingestion', 'validation']);
    // Seeded submissions are 'submitted' → ingestion (a subscribed lane), so they appear.
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item) => ['ingestion', 'validation'].includes(item.stageKey))).toBe(true);
    expect(body.items[0].values.submissionNumber).toBeDefined();
  });

  it('positions a submission by its latest ingestion event, overriding the status fallback', async () => {
    const { token, organizationId } = await seedAndSignToken();
    await subscribeToStages(organizationId!, PIPELINE_STAGE_KEYS);

    const submission = await Submission.findOne({ order: [['id', 'ASC']] });
    expect(submission).not.toBeNull();

    await IngestionEvent.create({
      submissionId: submission!.id,
      organizationId: submission!.organizationId ?? null,
      stage: 'extraction',
      status: 'completed',
    } as never);

    const response = await getBoard(token);
    const body = JSON.parse(response.payload) as { items: Array<{ id: number; stageKey: string; eventStatus: string }> };

    const item = body.items.find((entry) => entry.id === submission!.id);
    expect(item?.stageKey).toBe('extraction');
    expect(item?.eventStatus).toBe('ok');
  });

  it('flags a submission whose latest event failed', async () => {
    const { token, organizationId } = await seedAndSignToken();
    await subscribeToStages(organizationId!, PIPELINE_STAGE_KEYS);

    const submission = await Submission.findOne({ order: [['id', 'ASC']] });
    expect(submission).not.toBeNull();

    await IngestionEvent.create({
      submissionId: submission!.id,
      organizationId: submission!.organizationId ?? null,
      stage: 'validation',
      status: 'failed',
      errorMessage: 'Schema validation failed',
    } as never);

    const response = await getBoard(token);
    const body = JSON.parse(response.payload) as {
      items: Array<{ id: number; stageKey: string; hasError: boolean; eventStatus: string; values: Record<string, unknown> }>;
    };

    const item = body.items.find((entry) => entry.id === submission!.id);
    expect(item?.stageKey).toBe('validation');
    expect(item?.hasError).toBe(true);
    expect(item?.eventStatus).toBe('failed');
    expect(item?.values.errorMessage).toBe('Schema validation failed');
  });

  it('counts active ingestion channels (enabled and status active) for the organization', async () => {
    const { token, organizationId } = await seedAndSignToken();

    await IngestionChannel.create({ organizationId: organizationId, type: 'rabbitmq', label: 'Active queue', enabled: true, status: 'active', config: {} } as never);
    await IngestionChannel.create({ organizationId: organizationId, type: 'sftp', label: 'Disabled SFTP', enabled: false, status: 'idle', config: {} } as never);
    // Enabled but not yet 'active' (e.g. syncing) should NOT count as active.
    await IngestionChannel.create({ organizationId: organizationId, type: 'webhooks', label: 'Syncing webhook', enabled: true, status: 'syncing', config: {} } as never);

    const response = await getBoard(token);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { channels: { active: number; total: number } };
    expect(body.channels.total).toBe(3);
    expect(body.channels.active).toBe(1);
  });

  it('manually advances a submission to the next pipeline stage and records the event', async () => {
    await seedAndSignToken();
    const submission = await Submission.findOne({ where: { status: 'submitted' }, order: [['id', 'ASC']] });
    expect(submission).not.toBeNull();

    const response = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submission!.id}/advance`,
    });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { ok: boolean; fromStage: string; toStage: string; eventStatus: string };
    // A fresh 'submitted' submission sits in ingestion → next is OCR.
    expect(body.fromStage).toBe('ingestion');
    expect(body.toStage).toBe('ocr');

    const event = await IngestionEvent.findOne({
      attributes: ['id', 'stage', 'status', 'submissionId'],
      where: { submissionId: submission!.id, stage: 'ocr' },
    });
    expect(event).not.toBeNull();
  });

  it('returns 400 when the submission is already at the final stage', async () => {
    await seedAndSignToken();
    const submission = await Submission.findOne({ order: [['id', 'ASC']] });
    // Slice 5.4 — 'riskCompute' (Pricing) is now the final lane appended after
    // 'workflow', so the already-at-final-stage guard fires from there.
    await IngestionEvent.create({ submissionId: submission!.id, stage: 'riskCompute', status: 'completed' } as never);

    const response = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submission!.id}/advance`,
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 404 advancing an unknown submission', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pipeline/processes/submissions/999999/advance' });
    expect(response.statusCode).toBe(404);
  });

  it('re-runs the current (failed) stage in place and records a new event', async () => {
    await seedAndSignToken();
    const submission = await Submission.findOne({ order: [['id', 'ASC']] });
    expect(submission).not.toBeNull();

    // Submission's latest event is a failed validation.
    await IngestionEvent.create({
      submissionId: submission!.id,
      organizationId: submission!.organizationId ?? null,
      stage: 'validation',
      status: 'failed',
      errorMessage: 'transient validation error',
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submission!.id}/rerun`,
    });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { fromStage: string; toStage: string };
    // Re-runs validation in place (does NOT advance to schemaGeneration/workflow).
    expect(body.toStage).toBe('validation');
    expect(body.fromStage).toBe('normalization');

    // A second validation event (the re-run, tagged trigger=rerun) was recorded
    // alongside the original failed one.
    const validationEvents = await IngestionEvent.findAll({
      attributes: ['id', 'stage', 'metadata'],
      where: { submissionId: submission!.id, stage: 'validation' },
    });
    expect(validationEvents.length).toBeGreaterThanOrEqual(2);
    const triggers = validationEvents.map((event) => (event.metadata as { trigger?: string } | null)?.trigger);
    expect(triggers).toContain('rerun');
  });

  it('re-runs an explicitly targeted stage', async () => {
    await seedAndSignToken();
    const submission = await Submission.findOne({ order: [['id', 'ASC']] });
    await IngestionEvent.create({
      submissionId: submission!.id,
      organizationId: submission!.organizationId ?? null,
      stage: 'validation',
      status: 'failed',
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submission!.id}/rerun`,
      payload: { stageKey: 'extraction' },
    });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload) as { toStage: string };
    expect(body.toStage).toBe('extraction');
  });

  it('returns 400 re-running a non-rerunnable stage (ingestion entry point)', async () => {
    await seedAndSignToken();
    // A fresh 'submitted' submission resolves to the ingestion stage, which has no runner.
    const submission = await Submission.findOne({ where: { status: 'submitted' }, order: [['id', 'ASC']] });
    expect(submission).not.toBeNull();

    const response = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submission!.id}/rerun`,
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('stage_not_rerunnable');
  });

  it('returns 404 re-running an unknown submission', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pipeline/processes/submissions/999999/rerun' });
    expect(response.statusCode).toBe(404);
  });
});
