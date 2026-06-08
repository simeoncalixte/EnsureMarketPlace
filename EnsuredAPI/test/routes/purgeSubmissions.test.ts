import { buildApp } from '../../src/app';
import { initTestDb } from '../helpers/db';
import {
  Claim,
  Deal,
  IngestionChannel,
  IngestionEvent,
  InvestorProfile,
  Organization,
  Payout,
  PipelineArtifact,
  PipelineRun,
  Policy,
  Pricing,
  RiskPortfolio,
  StageExecution,
  Submission,
  SubmissionDocument,
  SubmissionFile,
  Token,
  Tranche,
  User,
} from '../../src/db/models';

// Full schema sync + reinsurance + channel seed runs well past Jest's 5s default.
jest.setTimeout(90000);

describe('POST /api/seed/purge-submissions', () => {
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

  // Seed the full business graph: reinsurance (orgs/users/profiles/policies/deals/
  // tranches/tokens/claims/payouts) + ingestion channels (submissions/files/docs/
  // pipeline runs/executions/artifacts).
  async function seedEverything() {
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/seed/reinsurance',
      payload: { investorCount: 2, policyCount: 2, exposuresPerPolicy: 1, tranchesPerDeal: 2 },
    });
    expect(r1.statusCode).toBe(201);
    const r2 = await app.inject({ method: 'POST', url: '/api/seed/ingestion-channels' });
    expect(r2.statusCode).toBe(201);
  }

  it('removes all submissions + associated data, keeping organizations and users', async () => {
    await seedEverything();

    // Sanity: the graph is populated before the purge.
    expect(await Submission.count()).toBeGreaterThan(0);
    expect(await SubmissionFile.count()).toBeGreaterThan(0);
    expect(await Policy.count()).toBeGreaterThan(0);
    expect(await Deal.count()).toBeGreaterThan(0);
    expect(await Tranche.count()).toBeGreaterThan(0);
    expect(await Claim.count()).toBeGreaterThan(0);
    expect(await PipelineRun.count()).toBeGreaterThan(0);
    expect(await StageExecution.count()).toBeGreaterThan(0);
    expect(await PipelineArtifact.count()).toBeGreaterThan(0);

    const orgsBefore = await Organization.count();
    const usersBefore = await User.count();
    const profilesBefore = await InvestorProfile.count();
    const channelsBefore = await IngestionChannel.count();
    expect(orgsBefore).toBeGreaterThan(0);
    expect(usersBefore).toBeGreaterThan(0);
    expect(profilesBefore).toBeGreaterThan(0);
    expect(channelsBefore).toBeGreaterThan(0);

    const res = await app.inject({
      method: 'POST',
      url: '/api/seed/purge-submissions',
      payload: { confirm: true },
    });
    expect(res.statusCode).toBe(200);
    const summary = JSON.parse(res.payload) as {
      totalDeleted: number;
      tablesCleared: number;
      keptOrganizations: number;
      keptUsers: number;
      keptInvestorProfiles: number;
      deleted: Record<string, number>;
    };
    expect(summary.totalDeleted).toBeGreaterThan(0);
    // Guards the "TRUNCATE ran on zero tables" regression.
    expect(summary.tablesCleared).toBeGreaterThan(0);
    expect(summary.deleted.submissions).toBeGreaterThan(0);
    expect(summary.keptOrganizations).toBe(orgsBefore);
    expect(summary.keptUsers).toBe(usersBefore);
    expect(summary.keptInvestorProfiles).toBe(profilesBefore);

    // Every business table is now empty…
    const businessModels: Array<{ count(): Promise<number> }> = [
      Submission,
      SubmissionFile,
      SubmissionDocument,
      IngestionEvent,
      PipelineRun,
      StageExecution,
      PipelineArtifact,
      Policy,
      Pricing,
      RiskPortfolio,
      Deal,
      Tranche,
      Token,
      Claim,
      Payout,
    ];
    for (const model of businessModels) {
      expect(await model.count()).toBe(0);
    }

    // …while identity + channels are untouched.
    expect(await Organization.count()).toBe(orgsBefore);
    expect(await User.count()).toBe(usersBefore);
    expect(await InvestorProfile.count()).toBe(profilesBefore);
    expect(await IngestionChannel.count()).toBe(channelsBefore);
  });

  it('refuses to purge without explicit confirmation', async () => {
    await seedEverything();
    const submissionsBefore = await Submission.count();
    expect(submissionsBefore).toBeGreaterThan(0);

    const res = await app.inject({ method: 'POST', url: '/api/seed/purge-submissions', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('confirmation_required');

    // Nothing was deleted.
    expect(await Submission.count()).toBe(submissionsBefore);
  });
});
