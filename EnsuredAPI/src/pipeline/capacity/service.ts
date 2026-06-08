import { runStage } from '../stageResult';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function parseMoney(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function loadRiskCapacity(): Record<string, number> {
  const fallback = {
    wind: 125_000_000,
    hurricane: 100_000_000,
    storm: 85_000_000,
    flood: 75_000_000,
    cyber: 25_000_000,
  };

  const raw = process.env.PIPELINE_OPEN_CAPACITY_BY_RISK_JSON;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, number> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const cap = Number(value);
      if (Number.isFinite(cap) && cap >= 0) normalized[key.toLowerCase()] = cap;
    });
    return Object.keys(normalized).length > 0 ? normalized : fallback;
  } catch (_) {
    return fallback;
  }
}

export class CapacityMatchService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('capacityMatch', () => this.runCapacityMatch(payload));
  }

  private async runCapacityMatch(payload: any): Promise<Record<string, unknown>> {
    const extraction = toRecord(payload?.extraction?.structuredData ?? payload?.extraction ?? {});
    const preRating = toRecord(payload?.preRating);
    const riskType = String(extraction.riskType ?? extraction.perilType ?? preRating.riskType ?? 'unknown').trim().toLowerCase();
    const dealSize = parseMoney(extraction.limit ?? extraction.dealSize ?? extraction.notional);
    const expectedYield = Number(extraction.expectedYield ?? preRating.expectedYield ?? 0) || 0;

    const capacityByRisk = loadRiskCapacity();
    const totalOpenCapacity = Number(process.env.PIPELINE_TOTAL_OPEN_CAPACITY ?? 500_000_000);
    const riskCapacity = Number(capacityByRisk[riskType] ?? 0);
    const hasCapacity = riskCapacity >= dealSize;

    const preferredRiskTypes = String(process.env.PIPELINE_TARGET_RISK_TYPES ?? 'wind,hurricane,storm,flood')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const inAppetite = preferredRiskTypes.includes(riskType);

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
      remainingRiskCapacity: Math.max(0, riskCapacity - dealSize),
      inAppetite,
      hasCapacity,
      route,
      destinationPool,
    };
  }
}
