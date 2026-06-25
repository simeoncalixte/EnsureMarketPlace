import {
  CanonicalSubmission,
  ComplianceClearance,
  InsurerProfile,
  JurisdictionLicenseAuthority,
  Organization,
  RiskPortfolio,
  SanctionsScreen,
  Submission,
} from '../../db/models';
import type { ComplianceClearanceStatus } from '../../db/models/compliance.models';
import { runStage } from '../stageResult';
import {
  type SanctionsProvider,
  type SanctionsScreenOutcome,
} from '../connectors/sanctions/SanctionsProvider';
import { selectSanctionsProvider } from '../connectors/sanctions/selectSanctionsProvider';
import {
  gatherScreeningParties,
  resolveJurisdiction,
  resolveLicensing,
  rollupClearance,
  worstSanctionsResult,
  type LicenseAuthorityRow,
  type ScreeningParty,
} from './logic';

/**
 * Pre-bind compliance stage (close-the-loop Issue 1).
 *
 * Runs the legally non-negotiable checks that sit between pricing and quote/bind:
 *   1. Sanctions / OFAC screening of every screenable party (cedent + any named
 *      insured) via the sanctions connector (real API or simulated fallback).
 *   2. Carrier admitted-status / licensing for the (jurisdiction, LOB, carrier)
 *      tuple against the JurisdictionLicenseAuthority table.
 *
 * It PERSISTS an append-only `ComplianceClearance` (the latest row is the
 * submission's current clearance the bind/quote gate reads) plus one immutable
 * `SanctionsScreen` per party screened. The decision logic is pure (`logic.ts`);
 * this module is the IO around it.
 *
 * Exposed two ways, mirroring the compute spine: a core
 * `screenSubmissionForCompliance(id)` callable from a route, and a thin
 * `PreBindComplianceService` pipeline-stage wrapper conforming to the stage
 * `{ ok, service, … }` contract.
 */

const SERVICE = 'preBindCompliance';
const NO_SUBMISSION_CODE = 'NO_SUBMISSION';

export type ComplianceScreenDeps = {
  sanctionsProvider?: SanctionsProvider;
  clock?: () => Date;
};

export type ComplianceScreenResult = {
  submissionId: number;
  clearanceId: number;
  status: ComplianceClearanceStatus;
  sanctionsStatus: ComplianceClearance['sanctionsStatus'];
  licensingStatus: ComplianceClearance['licensingStatus'];
  provider: string;
  sanctionsListVersion: string | null;
  parties: ScreeningParty[];
  checks: ComplianceClearance['checksJson'];
};

function toAuthorityRow(row: JurisdictionLicenseAuthority): LicenseAuthorityRow {
  return {
    countryCode: row.countryCode,
    stateCode: row.stateCode,
    lineOfBusinessCode: row.lineOfBusinessCode,
    carrierOrganizationId: row.carrierOrganizationId,
    admitted: row.admitted,
    surplusLinesEligible: row.surplusLinesEligible,
    licenseNumber: row.licenseNumber,
  };
}

/**
 * Screen one submission and persist its clearance + per-party screens. Throws only
 * on `submission_not_found`; the stage wrapper converts that to a structured
 * failure so the pipeline advance never crashes.
 */
export async function screenSubmissionForCompliance(
  submissionId: number,
  deps: ComplianceScreenDeps = {},
): Promise<ComplianceScreenResult> {
  const provider = deps.sanctionsProvider ?? selectSanctionsProvider();
  const clock = deps.clock ?? (() => new Date());

  const submission = await Submission.findByPk(submissionId, {
    include: [
      { model: InsurerProfile, as: 'insurerProfile', include: [{ model: Organization, as: 'organization' }] },
      { model: RiskPortfolio, as: 'portfolio' },
      { model: CanonicalSubmission, as: 'canonicalSubmission' },
    ],
  });
  if (!submission) {
    throw new Error('submission_not_found');
  }

  const insurerProfile = (submission as unknown as { insurerProfile?: InsurerProfile | null }).insurerProfile ?? null;
  const carrierOrganization =
    (insurerProfile as unknown as { organization?: Organization | null } | null)?.organization ?? null;
  const portfolio = (submission as unknown as { portfolio?: RiskPortfolio | null }).portfolio ?? null;
  const canonical = (submission as unknown as { canonicalSubmission?: CanonicalSubmission | null }).canonicalSubmission ?? null;

  const cedentName = carrierOrganization?.name ?? null;
  const canonicalData = canonical?.data ?? null;
  const lineOfBusinessCode = canonical?.lineOfBusinessCode ?? null;

  // 1) Sanctions screening — one screen per party.
  const parties = gatherScreeningParties({ cedentName, canonicalData });
  const jurisdiction = resolveJurisdiction({ canonicalData, portfolioRegion: portfolio?.region ?? null });

  const screenedAt = clock();
  const outcomes: Array<{ party: ScreeningParty; outcome: SanctionsScreenOutcome }> = [];
  for (const party of parties) {
    const outcome = await provider.screen({ name: party.name, countryCode: jurisdiction.countryCode });
    outcomes.push({ party, outcome });
  }

  const sanctionsStatus = worstSanctionsResult(outcomes.map(({ outcome }) => outcome.result));
  const sanctionsListVersion = outcomes[0]?.outcome.listVersion ?? null;

  // 2) Carrier admitted-status / licensing.
  const authorityRows = await JurisdictionLicenseAuthority.findAll({
    where: { countryCode: jurisdiction.countryCode, status: 'active' },
  });
  const licensing = resolveLicensing(authorityRows.map(toAuthorityRow), {
    countryCode: jurisdiction.countryCode,
    stateCode: jurisdiction.stateCode,
    lineOfBusinessCode,
    carrierOrganizationId: carrierOrganization?.id ?? null,
  });

  const jurisdictionLabel = jurisdiction.stateCode
    ? `${jurisdiction.countryCode}-${jurisdiction.stateCode}`
    : jurisdiction.countryCode;
  const { status, checks } = rollupClearance({
    sanctionsStatus,
    licensingStatus: licensing.status,
    partyCount: parties.length,
    jurisdictionLabel,
  });

  // Persist the append-only clearance rollup, then link each immutable screen to it.
  const clearance = await ComplianceClearance.create({
    submissionId: submission.id,
    organizationId: submission.organizationId ?? null,
    status,
    sanctionsStatus,
    licensingStatus: licensing.status,
    checksJson: checks,
    evidenceJson: {
      jurisdiction: jurisdictionLabel,
      lineOfBusinessCode,
      carrierOrganizationId: carrierOrganization?.id ?? null,
      licenseNumber: licensing.authority?.licenseNumber ?? null,
      sanctions: outcomes.map(({ party, outcome }) => ({
        party: party.name,
        role: party.role,
        result: outcome.result,
        matches: outcome.matches,
      })),
    },
    provider: provider.name,
    sanctionsListVersion,
    reviewedByUserId: null,
    reviewedAt: null,
    screenedAt,
  });

  for (const { party, outcome } of outcomes) {
    await SanctionsScreen.create({
      submissionId: submission.id,
      clearanceId: clearance.id,
      organizationId: submission.organizationId ?? null,
      partyName: party.name,
      partyRole: party.role,
      provider: outcome.provider,
      listVersion: outcome.listVersion,
      result: outcome.result,
      matchesJson: outcome.matches as unknown as Record<string, unknown>[],
      screenedAt,
    });
  }

  return {
    submissionId: submission.id,
    clearanceId: clearance.id,
    status,
    sanctionsStatus,
    licensingStatus: licensing.status,
    provider: provider.name,
    sanctionsListVersion,
    parties,
    checks,
  };
}

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

export class PreBindComplianceService {
  private readonly deps: ComplianceScreenDeps;

  constructor(deps: ComplianceScreenDeps = {}) {
    this.deps = deps;
  }

  async process(payload: unknown): Promise<Record<string, unknown>> {
    return runStage(SERVICE, () => this.runCompliance(payload));
  }

  private async runCompliance(payload: unknown): Promise<Record<string, unknown>> {
    const submission = toRecord(toRecord(payload).submission);
    const rawId = submission.id;
    const submissionId = Number(rawId);

    if (rawId == null || !Number.isFinite(submissionId)) {
      return { ok: false, service: SERVICE, error: 'no submission id in payload', code: NO_SUBMISSION_CODE };
    }

    const result = await screenSubmissionForCompliance(submissionId, this.deps);

    // A failed/blocked compliance outcome is still a SUCCESSFUL stage run (the
    // screen completed and produced a clearance) — the gate, not the stage, is
    // what blocks the bind. Surface the outcome + a warning so the board shows it.
    const warnings =
      result.status === 'failed'
        ? ['Compliance blocked: ' + result.checks.filter((c) => c.status === 'hit' || c.status === 'not_authorized').map((c) => c.detail).join('; ')]
        : result.status === 'review'
          ? ['Compliance needs review before bind.']
          : [];

    return {
      ok: true,
      service: SERVICE,
      provider: result.provider,
      submissionId: result.submissionId,
      clearanceId: result.clearanceId,
      complianceStatus: result.status,
      sanctionsStatus: result.sanctionsStatus,
      licensingStatus: result.licensingStatus,
      sanctionsListVersion: result.sanctionsListVersion,
      partyCount: result.parties.length,
      warnings,
    };
  }
}
