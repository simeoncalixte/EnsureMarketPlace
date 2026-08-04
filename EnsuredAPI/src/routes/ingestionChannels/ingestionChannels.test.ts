import { buildApp } from '../../app';
import { initTestDb } from '../../../test/helpers/db';

// Reinsurance seed + channel seed run past Jest's 5s default.
jest.setTimeout(60000);

describe('ingestion channels ↔ submissions', () => {
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

  async function seedReinsurance() {
    const res = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 2, policyCount: 2, exposuresPerPolicy: 1, tranchesPerDeal: 1 },
    });
    expect(res.statusCode).toBe(201);
  }

  it('seeds channels (per config) assigned to the org, each with linked submissions', async () => {
    await seedReinsurance();

    const seedRes = await app.inject({ method: 'POST', url: '/api/seed/ingestion-channels' });
    expect(seedRes.statusCode).toBe(201);
    const summary = JSON.parse(seedRes.payload) as { organizationId: number | null; channels: number; submissions: number };
    expect(summary.channels).toBe(5);
    expect(summary.submissions).toBeGreaterThan(0);
    expect(typeof summary.organizationId).toBe('number');

    const listRes = await app.inject({ method: 'GET', url: '/api/ingestion-channels' });
    expect(listRes.statusCode).toBe(200);
    const channels = JSON.parse(listRes.payload) as Array<{ id: number; organizationId: number | null; submissionCount: number; status: string; enabled: boolean }>;

    expect(channels).toHaveLength(5);
    // Every channel is assigned to the (single, fixed) org and carries a count.
    expect(channels.every((c) => c.organizationId === summary.organizationId)).toBe(true);
    expect(channels.every((c) => typeof c.submissionCount === 'number')).toBe(true);
    // Both active and inactive channels produced submissions.
    expect(channels.some((c) => c.enabled && c.submissionCount > 0)).toBe(true);
    expect(channels.some((c) => !c.enabled && c.submissionCount > 0)).toBe(true);
  });

  it('returns the submissions generated from a given channel', async () => {
    await seedReinsurance();
    await app.inject({ method: 'POST', url: '/api/seed/ingestion-channels' });

    const channels = JSON.parse((await app.inject({ method: 'GET', url: '/api/ingestion-channels' })).payload) as Array<{ id: number; submissionCount: number }>;
    const channel = channels.find((c) => c.submissionCount > 0)!;
    expect(channel).toBeDefined();

    const subsRes = await app.inject({ method: 'GET', url: `/api/ingestion-channels/${channel.id}/submissions` });
    expect(subsRes.statusCode).toBe(200);
    const submissions = JSON.parse(subsRes.payload) as Array<{ id: number; submissionNumber: string; status: string; source: string | null; receivedAt: string | null }>;

    expect(submissions).toHaveLength(channel.submissionCount);
    expect(submissions[0].submissionNumber).toMatch(/^SUB-/);
    expect(submissions[0].status).toBeTruthy();
  });

  it('404s for submissions of a non-existent channel', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ingestion-channels/999999/submissions' });
    expect(res.statusCode).toBe(404);
  });
});
