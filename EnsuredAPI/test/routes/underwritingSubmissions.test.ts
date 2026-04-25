import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { initTestDb } from '../helpers/db';
import { User } from '../../src/db/models/identity.models';

describe('underwriting submissions dashboard', () => {
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

    return { token, batchId: summary.batchId };
  }

  it('returns a backend-configured board for the current organization', async () => {
    const { token, batchId } = await seedAndSignToken();

    const response = await app.inject({
      method: 'GET',
      url: '/api/underwriting/submissions',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { config: { title: string; stages: Array<{ label: string }> }; items: Array<{ id: number; values: Record<string, unknown> }> };

    expect(body.config.title).toBe('Incoming Submissions');
    expect(body.config.stages.length).toBeGreaterThanOrEqual(4);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].values.submissionNumber).toBeDefined();
    expect(body.items[0].values.cedent).toBeDefined();
    expect(body.items[0].values.priority).toBeDefined();
    expect(body.items.some((item) => String(item.values.submissionNumber).includes(batchId.slice(0, 4)) || typeof item.id === 'number')).toBe(true);
  });

  it('persists backend config changes and advances submissions through the API', async () => {
    const { token } = await seedAndSignToken();

    const dashboardBefore = await app.inject({
      method: 'GET',
      url: '/api/underwriting/submissions',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dashboardBefore.statusCode).toBe(200);
    const board = JSON.parse(dashboardBefore.payload) as { config: { stages: Array<{ key: string; label: string; statuses: string[]; accent: string; background: string; border: string; description: string; emptyState: string }> }; items: Array<{ id: number; nextStatus: string | null; status: string }> };

    const customStatus = 'client_review';
    const customStage = {
      key: 'client-review',
      label: 'Client Review',
      statuses: [customStatus],
      accent: '#14b8a6',
      background: 'rgba(20, 184, 166, 0.12)',
      border: 'rgba(20, 184, 166, 0.28)',
      description: 'Awaiting client-side review of the submission.',
      emptyState: 'No client review submissions yet.',
    };

    const configRes = await app.inject({
      method: 'PUT',
      url: '/api/underwriting/submissions/config',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      payload: {
        ...board.config,
        title: 'Configured Live Queue',
        description: 'Custom board shipped from the backend.',
        stages: [...board.config.stages, customStage],
      },
    });

    expect(configRes.statusCode).toBe(200);
    const savedConfig = JSON.parse(configRes.payload) as { title: string; stages: Array<{ key: string; statuses: string[] }> };
    expect(savedConfig.title).toBe('Configured Live Queue');
    expect(savedConfig.stages.some((stage) => stage.key === customStage.key && stage.statuses.includes(customStatus))).toBe(true);

    const dashboardRes = await app.inject({
      method: 'GET',
      url: '/api/underwriting/submissions',
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashboard = JSON.parse(dashboardRes.payload) as { items: Array<{ id: number; nextStatus: string | null; status: string; stageKey: string }> };
    const firstItem = dashboard.items[0];
    expect(firstItem).toBeDefined();

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/underwriting/submissions/${firstItem.id}/status`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      payload: { status: customStatus },
    });

    expect(patchRes.statusCode).toBe(200);
    const patched = JSON.parse(patchRes.payload) as { id: number; status: string; stageKey: string; nextStatus: string | null };
    expect(patched.id).toBe(firstItem.id);
    expect(patched.status).toBe(customStatus);
    expect(patched.stageKey).toBe(customStage.key);

    const refreshed = await app.inject({
      method: 'GET',
      url: '/api/underwriting/submissions',
      headers: { Authorization: `Bearer ${token}` },
    });
    const refreshedBody = JSON.parse(refreshed.payload) as { items: Array<{ id: number; status: string; stageKey: string }> };
    const refreshedItem = refreshedBody.items.find((item) => item.id === firstItem.id);
    expect(refreshedItem?.status).toBe(customStatus);
    expect(refreshedItem?.stageKey).toBe(customStage.key);
  });
});