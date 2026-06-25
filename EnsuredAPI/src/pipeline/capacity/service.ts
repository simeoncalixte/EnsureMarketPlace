import { runStage } from '../stageResult';
import { loadAppetiteForTenant } from '../validation/appetiteEngine';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function parseMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Resolve the org's configured per-peril capacity. Single source of truth =
 * `OrganizationAppetiteProfile.capacityByPeril` (keys lowercased). Injectable so
 * the stage stays unit-testable without a database.
 */
export type CapacityByPerilLoader = (
  organizationId: number | null | undefined,
) => Promise<Record<string, number>>;

const defaultCapacityByPerilLoader: CapacityByPerilLoader = async (organizationId) => {
  const appetite = await loadAppetiteForTenant(organizationId);
  const raw = (appetite?.profile?.capacityByPeril ?? {}) as Record<string, unknown>;
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const cap = Number(value);
    if (Number.isFinite(cap) && cap >= 0) normalized[key.trim().toLowerCase()] = cap;
  }
  return normalized;
};

export class CapacityMatchService {
  constructor(private readonly deps: { loadCapacityByPeril?: CapacityByPerilLoader } = {}) {}

  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('capacityMatch', () => this.runCapacityMatch(payload));
  }

  private async runCapacityMatch(payload: any): Promise<Record<string, unknown>> {
    const extraction = toRecord(payload?.extraction?.structuredData ?? payload?.extraction ?? {});
    const preRating = toRecord(payload?.preRating);
    const appetite = toRecord(toRecord(payload?.validation).appetite);

    const riskType = String(
      extraction.riskType ?? extraction.perilType ?? preRating.riskType ?? 'unknown',
    )
      .trim()
      .toLowerCase();
    const dealSize = parseMoney(extraction.limit ?? extraction.dealSize ?? extraction.notional);
    const expectedYield = Number(extraction.expectedYield ?? preRating.expectedYield ?? 0) || 0;

    // Appetite is owned by the validation stage's appetite engine. Capacity CONSUMES
    // that single, org-configured decision instead of a hardcoded peril list. When no
    // decision is present we do NOT block on missing info (the appetite engine already
    // gates genuine out-of-appetite risks upstream).
    const appetiteDecision = typeof appetite.decision === 'string' ? appetite.decision : null;
    const inAppetite = appetiteDecision ? appetiteDecision !== 'OUT_OF_APPETITE' : true;

    // Per-peril capacity comes from the org's configured appetite profile
    // (capacityByPeril) — NOT a hardcoded table.
    const loadCapacityByPeril = this.deps.loadCapacityByPeril ?? defaultCapacityByPerilLoader;
    const capacityByPeril = await loadCapacityByPeril(payload?.submission?.organizationId ?? null);

    const hasConfiguredCap = Object.prototype.hasOwnProperty.call(capacityByPeril, riskType);
    const riskCapacity = hasConfiguredCap ? Number(capacityByPeril[riskType]) : null;
    const totalOpenCapacity = Object.values(capacityByPeril).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0,
    );

    // No configured cap for this peril ⇒ unknown; do not fabricate a shortfall.
    const hasCapacity = riskCapacity == null ? true : riskCapacity >= dealSize;

    const flags: string[] = [];
    if (!appetiteDecision) flags.push('appetite:no_decision_defaulted_in');
    if (riskCapacity == null) flags.push('capacity:unconfigured_for_peril');

    let route = 'standard_queue';
    let destinationPool = 'primary';
    if (!inAppetite || !hasCapacity) {
      route = 'partner_pool';
      destinationPool = inAppetite ? 'overflow' : 'external-partner';
    } else if (preRating.grade === 'A' || preRating.grade === 'B') {
      route = 'priority_queue';
      destinationPool = 'primary-priority';
    }

    return {
      ok: true,
      service: 'capacityMatch',
      riskType,
      expectedYield,
      dealSize,
      totalOpenCapacity,
      riskCapacity,
      remainingRiskCapacity: riskCapacity == null ? null : Math.max(0, riskCapacity - dealSize),
      inAppetite,
      hasCapacity,
      route,
      destinationPool,
      appetiteDecision,
      flags,
    };
  }
}
