import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { initTestDb } from '../helpers/db';
import { User } from '../../src/db/models';

// Full schema sync + reinsurance seed per test runs well past Jest's 5s default.
jest.setTimeout(60000);

const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

describe('pipeline playback (runs / executions / artifacts)', () => {
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

  async function signInsurerToken() {
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 2, policyCount: 2, exposuresPerPolicy: 1, tranchesPerDeal: 2 },
    });
    const { batchId } = JSON.parse(seedRes.payload) as { batchId: string };
    const underwriter = await User.findOne({ where: { email: `underwriter.${batchId}@ensured.local` } });
    return { token: jwt.sign({ userId: underwriter!.id }, SECRET) };
  }

  async function seedOneSubmission(token: string): Promise<number> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 1 },
    });
    expect(res.statusCode).toBe(201);
    return (JSON.parse(res.payload) as { submissions: Array<{ id: number }> }).submissions[0].id;
  }

  it('captures a replayable run as a submission is advanced, and exposes it', async () => {
    const { token } = await signInsurerToken();
    const submissionId = await seedOneSubmission(token);

    // ingestion → ocr → classification
    for (let i = 0; i < 2; i += 1) {
      const adv = await app.inject({
        method: 'POST',
        url: `/api/pipeline/processes/submissions/${submissionId}/advance`,
      });
      expect(adv.statusCode).toBe(200);
      expect(typeof (JSON.parse(adv.payload) as { runId: number | null }).runId).toBe('number');
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/pipeline/processes/submissions/${submissionId}/runs`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      runCount: number;
      runs: Array<{
        fromStage: string;
        status: string;
        executions: Array<{ stageKey: string; status: string; inputArtifactId: number; outputArtifactId: number }>;
        artifacts: Array<{ stageKey: string; role: string }>;
      }>;
    };

    // A single run reused across both advances, starting from ingestion.
    expect(body.runCount).toBe(1);
    const run = body.runs[0];
    expect(run.fromStage).toBe('ingestion');
    expect(run.executions.map((e) => e.stageKey)).toEqual(['ocr', 'classification']);
    // Two stages × (input + output) artifacts.
    expect(run.artifacts).toHaveLength(4);

    const ocr = run.executions.find((e) => e.stageKey === 'ocr')!;
    // OCR reads the seeded text extract off disk, so it completes.
    expect(ocr.status).toBe('completed');
    expect(typeof ocr.inputArtifactId).toBe('number');
    expect(typeof ocr.outputArtifactId).toBe('number');

    // The OCR stage's OUTPUT artifact carries the ocr service result.
    const ocrOut = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/pipeline/processes/artifacts/${ocr.outputArtifactId}` })).payload,
    ) as { role: string; payload: { service?: string } };
    expect(ocrOut.role).toBe('output');
    expect(ocrOut.payload.service).toBe('ocr');

    // Threading: the classification stage's INPUT artifact carries the prior OCR
    // output — proof that stage outputs flow forward (not just `{ submission }`).
    const classification = run.executions.find((e) => e.stageKey === 'classification')!;
    const classIn = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/pipeline/processes/artifacts/${classification.inputArtifactId}` }))
        .payload,
    ) as { role: string; payload: Record<string, unknown> };
    expect(classIn.role).toBe('input');
    expect(classIn.payload).toHaveProperty('submission');
    expect(classIn.payload).toHaveProperty('ocr');

    // Unknown artifact → 404.
    const missing = await app.inject({ method: 'GET', url: '/api/pipeline/processes/artifacts/99999' });
    expect(missing.statusCode).toBe(404);
  });

  it('returns an empty playback for a submission that was never advanced', async () => {
    const { token } = await signInsurerToken();
    const submissionId = await seedOneSubmission(token);

    const res = await app.inject({
      method: 'GET',
      url: `/api/pipeline/processes/submissions/${submissionId}/runs`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { runCount: number; runs: unknown[] };
    expect(body.runCount).toBe(0);
    expect(body.runs).toHaveLength(0);
  });
});
