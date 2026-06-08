import { ValidationService, ValidationDeps } from './service';
import { ScrubSignals, ValidationDecision } from './types';
import { SubmissionDocumentRepository } from './repository';

const cleanSignals: ScrubSignals = {
  addressValid: true,
  domainSecure: true,
  address: '123 Main St, Town',
  domain: 'acme.com',
  provider: 'local-heuristics',
};

function makeDeps(overrides: Partial<ValidationDeps> = {}) {
  const saved: any[] = [];
  const repository: SubmissionDocumentRepository = {
    async upsertValidation(submissionId, tenantId, validation) {
      saved.push({ submissionId, tenantId, validation });
    },
  };
  const deps: Partial<ValidationDeps> = {
    scrubProvider: async () => cleanSignals,
    appetiteLoader: async () => null,
    semanticJudge: async () => null, // judge abstains unless a test overrides it
    repository,
    clock: () => new Date('2026-06-03T00:00:00.000Z'),
    ...overrides,
  };
  return { deps, saved };
}

describe('ValidationService (injected, no DB/network)', () => {
  test('clean submission with no appetite passes deterministically', async () => {
    const { deps, saved } = makeDeps();
    const svc = new ValidationService(deps);
    const out = await svc.process({
      submission: { id: 1, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1_000_000, effectiveDate: '2026-07-01' } },
    });
    expect(out.decision).toBe(ValidationDecision.PASS);
    expect(out.flaggedForMoreInfo).toBe(false);
    expect(out.validatedAt).toBe('2026-06-03T00:00:00.000Z');
    expect(saved).toHaveLength(1);
    expect(saved[0].tenantId).toBe(9);
  });

  test('appetite reject routes to OUT_OF_APPETITE', async () => {
    const { deps } = makeDeps({
      appetiteLoader: async () => ({
        profile: { id: 7, excludedPerils: ['cyber'] } as any,
        rules: [] as any,
      }),
    });
    const svc = new ValidationService(deps);
    const out = await svc.process({
      submission: { id: 2, tenantId: 9 },
      normalization: { normalized: { riskType: 'cyber', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.decision).toBe(ValidationDecision.OUT_OF_APPETITE);
  });

  test('appetite loader failure degrades gracefully (best-effort)', async () => {
    const { deps } = makeDeps({
      appetiteLoader: async () => { throw new Error('db down'); },
    });
    const svc = new ValidationService(deps);
    const out = await svc.process({
      submission: { id: 3, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.ok).toBe(true);
    expect(out.decision).toBe(ValidationDecision.PASS);
  });

  test('does not persist when there is no submission id', async () => {
    const { deps, saved } = makeDeps();
    const svc = new ValidationService(deps);
    await svc.process({ normalization: { normalized: { riskType: 'wind' } } });
    expect(saved).toHaveLength(0);
  });

  test('a FLAGGED semantic verdict routes an otherwise-clean submission to MORE_INFO', async () => {
    const { deps } = makeDeps({
      semanticJudge: async () => ({
        decision: 'FLAGGED',
        confidence: 0.8,
        findings: [{ check: 'consistency', severity: 'flag', reason: 'limit implausible for stated property' }],
        modelVersion: 'qwen-plus',
      }),
    });
    const out: any = await new ValidationService(deps).process({
      submission: { id: 10, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.decision).toBe(ValidationDecision.MORE_INFO);
    expect(out.semantic.available).toBe(true);
    expect(out.reasons).toContain('limit implausible for stated property');
  });

  test('default policy caps an LLM reject to a flag (no unattended auto-reject)', async () => {
    const { deps } = makeDeps({
      semanticJudge: async () => ({
        decision: 'OUT_OF_APPETITE',
        confidence: 0.99,
        findings: [{ check: 'fraud', severity: 'reject', reason: 'looks fraudulent' }],
        modelVersion: 'qwen-plus',
      }),
    });
    const out: any = await new ValidationService(deps).process({
      submission: { id: 11, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.decision).toBe(ValidationDecision.MORE_INFO); // capped to flag, not OUT_OF_APPETITE
    expect(out.semantic.decision).toBe('FLAGGED');
  });

  test('a low-confidence verdict is ignored (abstain)', async () => {
    const { deps } = makeDeps({
      semanticJudge: async () => ({
        decision: 'FLAGGED',
        confidence: 0.2,
        findings: [{ check: 'x', severity: 'flag', reason: 'maybe' }],
        modelVersion: 'qwen-plus',
      }),
    });
    const out: any = await new ValidationService(deps).process({
      submission: { id: 12, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.decision).toBe(ValidationDecision.PASS);
    expect(out.semantic.available).toBe(false);
  });

  test('a throwing judge degrades gracefully', async () => {
    const { deps } = makeDeps({ semanticJudge: async () => { throw new Error('api down'); } });
    const out: any = await new ValidationService(deps).process({
      submission: { id: 13, tenantId: 9 },
      normalization: { normalized: { riskType: 'wind', limit: 1, effectiveDate: '2026-07-01' } },
    });
    expect(out.ok).toBe(true);
    expect(out.decision).toBe(ValidationDecision.PASS);
    expect(out.semantic.available).toBe(false);
  });
});
