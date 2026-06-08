import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { initTestDb } from '../helpers/db';
import { Organization, User } from '../../src/db/models/identity.models';
import { SubmissionDocument, SubmissionFile } from '../../src/db/models';

// Full schema sync + reinsurance seed per test runs well past Jest's 5s default.
jest.setTimeout(60000);

const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

type SeedSummary = {
  organizationId: number;
  insurerProfileId: number;
  portfolioId: number;
  channelId: number | null;
  channelLabel: string | null;
  submissionsCreated: number;
  documentsCreated: number;
  filesCreated: number;
  averageComplexity: number;
  complexityRange: { min: number; max: number };
  submissions: Array<{
    id: number;
    submissionNumber: string;
    status: string;
    source: string | null;
    transport: string | null;
    fileName: string | null;
    complexity: number;
    lineOfBusiness: string;
    cedent: string;
    fileCount: number;
  }>;
  subscribedStages: string[];
};

describe('POST /api/seed/pipeline-submissions', () => {
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

  // Seeds a reinsurance batch (which creates an insurer org + underwriter user)
  // and returns a token for that underwriter — i.e. a "current user session"
  // belonging to an insurer organization.
  async function signInsurerToken() {
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 2, policyCount: 2, exposuresPerPolicy: 1, tranchesPerDeal: 2 },
    });
    expect(seedRes.statusCode).toBe(201);
    const { batchId } = JSON.parse(seedRes.payload) as { batchId: string };

    const underwriter = await User.findOne({ where: { email: `underwriter.${batchId}@ensured.local` } });
    expect(underwriter).not.toBeNull();

    return {
      token: jwt.sign({ userId: underwriter!.id }, SECRET),
      organizationId: underwriter!.organizationId!,
    };
  }

  it('rejects an unauthenticated request', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/seed/pipeline-submissions', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('returns 422 when the calling user has no organization', async () => {
    const user = await User.create({
      organizationId: null,
      email: 'no.org@ensured.local',
      passwordHash: 'seed',
      role: 'investor',
      firstName: 'No',
      lastName: 'Org',
      isActive: true,
    });
    const token = jwt.sign({ userId: user.id }, SECRET);

    const res = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 2 },
    });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.payload).error).toBe('organization_required');
  });

  it('seeds incoming submissions into the caller organization and exposes them on the board', async () => {
    const { token, organizationId } = await signInsurerToken();

    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 2 },
    });
    expect(seedRes.statusCode).toBe(201);

    const summary = JSON.parse(seedRes.payload) as SeedSummary;
    expect(summary.organizationId).toBe(organizationId);
    expect(summary.insurerProfileId).toBeGreaterThan(0);
    expect(summary.portfolioId).toBeGreaterThan(0);
    expect(summary.channelId).toBeGreaterThan(0);
    expect(summary.submissionsCreated).toBe(2);
    expect(summary.submissions).toHaveLength(2);
    expect(summary.submissions[0].status).toBe('submitted');
    expect(summary.subscribedStages).toContain('ingestion');

    // The seeded submissions should now appear on the org's pipeline board,
    // sitting in the ingestion lane and ready to be advanced manually.
    const boardRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline/processes/board',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(boardRes.statusCode).toBe(200);

    const board = JSON.parse(boardRes.payload) as {
      config: { stages: Array<{ key: string }> };
      items: Array<{ id: number; stageKey: string }>;
    };
    expect(board.config.stages.map((s) => s.key)).toContain('ingestion');

    const seededIds = summary.submissions.map((s) => s.id);
    const onBoard = board.items.filter((item) => seededIds.includes(item.id));
    expect(onBoard).toHaveLength(2);
    expect(onBoard.every((item) => item.stageKey === 'ingestion')).toBe(true);
  });

  it('can advance a freshly seeded submission to the next stage', async () => {
    const { token } = await signInsurerToken();

    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 1 },
    });
    const summary = JSON.parse(seedRes.payload) as SeedSummary;
    const submissionId = summary.submissions[0].id;

    const advanceRes = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submissionId}/advance`,
    });
    expect(advanceRes.statusCode).toBe(200);
    const advance = JSON.parse(advanceRes.payload) as { fromStage: string; toStage: string };
    expect(advance.fromStage).toBe('ingestion');
    expect(advance.toStage).toBe('ocr');
  });

  it('generates OCR text from the seeded document when advanced to the OCR stage', async () => {
    const { token } = await signInsurerToken();

    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 1 },
    });
    const summary = JSON.parse(seedRes.payload) as SeedSummary;
    expect(summary.documentsCreated).toBe(1);
    expect(summary.submissions[0].fileName).toBeTruthy();
    const submissionId = summary.submissions[0].id;

    // Advance ingestion → OCR: the OCR stage reads the seeded document off disk and
    // persists the extracted text to the submission_outputs table.
    const advanceRes = await app.inject({
      method: 'POST',
      url: `/api/pipeline/processes/submissions/${submissionId}/advance`,
    });
    expect(advanceRes.statusCode).toBe(200);
    expect((JSON.parse(advanceRes.payload) as { toStage: string }).toStage).toBe('ocr');

    const doc = await SubmissionDocument.findOne({ where: { submissionId } });
    expect(doc).not.toBeNull();
    const ocrText = (doc!.structuredData as any)?.ocr?.text ?? '';
    expect(ocrText.length).toBeGreaterThan(0);
    expect(ocrText).toContain('ACORD');
  });

  it('attaches a complex, varied document package averaging complexity 7', async () => {
    const { token, organizationId } = await signInsurerToken();

    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 8 },
    });
    expect(seedRes.statusCode).toBe(201);
    const summary = JSON.parse(seedRes.payload) as SeedSummary;

    // The brief: average complexity is exactly 7 on a 1..10 scale.
    expect(summary.averageComplexity).toBe(7);
    expect(summary.complexityRange.min).toBeGreaterThanOrEqual(1);
    expect(summary.complexityRange.max).toBeLessThanOrEqual(10);

    // Every submission carries a multi-file package (text extract + attachments).
    expect(summary.filesCreated).toBeGreaterThan(summary.submissionsCreated);
    for (const s of summary.submissions) {
      expect(s.complexity).toBeGreaterThanOrEqual(1);
      expect(s.complexity).toBeLessThanOrEqual(10);
      expect(s.fileCount).toBeGreaterThan(1);
      expect(s.lineOfBusiness).toBeTruthy();
    }

    // The attachments are persisted (the board renders this as each card's file count).
    const totalFiles = await SubmissionFile.count({ where: { tenantId: organizationId } });
    expect(totalFiles).toBe(summary.filesCreated);

    // The package spans the real document families — PDFs, spreadsheets and images.
    const types = (await SubmissionFile.findAll({ where: { tenantId: organizationId } })).map((f) =>
      String(f.fileType),
    );
    expect(types.some((t) => t === 'application/pdf')).toBe(true);
    expect(types.some((t) => t.includes('spreadsheetml'))).toBe(true);
    expect(types.some((t) => t.startsWith('image/'))).toBe(true);
  });

  it('does not subscribe the org when ensureSubscriptions is false', async () => {
    const { token } = await signInsurerToken();

    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/seed/pipeline-submissions',
      headers: { Authorization: `Bearer ${token}` },
      payload: { count: 1, ensureSubscriptions: false },
    });
    expect(seedRes.statusCode).toBe(201);
    expect((JSON.parse(seedRes.payload) as SeedSummary).subscribedStages).toHaveLength(0);

    // With no subscriptions the org's board shows no lanes (and therefore no items).
    const boardRes = await app.inject({
      method: 'GET',
      url: '/api/pipeline/processes/board',
      headers: { Authorization: `Bearer ${token}` },
    });
    const board = JSON.parse(boardRes.payload) as { config: { stages: unknown[] }; items: unknown[] };
    expect(board.config.stages).toHaveLength(0);
    expect(board.items).toHaveLength(0);
  });
});
