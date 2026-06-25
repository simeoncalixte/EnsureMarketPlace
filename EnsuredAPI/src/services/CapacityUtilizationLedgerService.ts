import { Op } from 'sequelize';
import { CapacityDefinition, CapacityUtilizationEntry } from '../db/models';
import { parseEntry } from './CapacityGovernanceService';
import {
  resolveCityId,
  resolveCountryId,
  resolveStateProvinceId,
} from '../pipeline/locationDiscovery/geography';

/**
 * CapacityUtilizationLedgerService — the stored side of capacity consumption.
 *
 * `locationUtilizationService` *computes* deployed exposure from in-force
 * policies for the map layer; this service *records* exposure as it is committed
 * so "remaining capacity" is a point-in-time, auditable fact rather than a
 * re-derivation. One row per (definition, subjectType, subjectId): recording the
 * same subject again updates its row (idempotent), so re-running a bind doesn't
 * double-count. Only `bound` / `in_flight` rows count as deployed; releasing or
 * expiring a commitment keeps the row for history but frees the capacity.
 */

/** Statuses that still consume capacity. */
const ACTIVE_STATUSES = ['bound', 'in_flight'];

export type RecordUtilizationInput = {
  lineOfBusinessCode?: string;
  /** Optional jurisdiction, encoded like a location limit (`US`, `US/Florida`). */
  entry?: string | null;
  subjectType: string;
  subjectId: number;
  exposureAmount: number | string;
  premiumAmount?: number | string | null;
  currency?: string;
  status?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type CapacityUtilizationSummary = {
  capacityDefinitionId: number;
  currency: string;
  grossCapacity: number | null;
  netRetention: number | null;
  /** Sum of exposure on active (bound + in_flight) rows. */
  deployed: number;
  /** Active premium booked. */
  premium: number;
  /** grossCapacity − deployed, or null when no gross capacity is set. */
  remaining: number | null;
  /** deployed ÷ grossCapacity as a 0–100 integer, or null when no gross capacity. */
  utilizationPct: number | null;
  activeCount: number;
  byLineOfBusiness: Array<{ lineOfBusinessCode: string; deployed: number; count: number }>;
};

function toMoney(value: number | string | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(n) : '0';
}

function numOrNull(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export class CapacityUtilizationLedgerService {
  /**
   * Record (or refresh) the exposure a subject commits against a definition.
   * Returns null when the definition isn't in the organization.
   */
  async record(
    organizationId: number,
    capacityDefinitionId: number,
    input: RecordUtilizationInput,
    recordedByUserId: number | null = null,
  ): Promise<CapacityUtilizationEntry | null> {
    const def = await CapacityDefinition.findOne({ where: { id: capacityDefinitionId, organizationId } });
    if (!def) return null;

    const lineOfBusinessCode = String(input.lineOfBusinessCode ?? '*').trim() || '*';

    // Resolve geography best-effort from the encoded entry, so the ledger can be
    // rolled up by region the same way location limits are.
    let entry: string | null = null;
    let level: string | null = null;
    let countryId: number | null = null;
    let stateProvinceId: number | null = null;
    let cityId: number | null = null;
    const parsed = input.entry ? parseEntry(String(input.entry)) : null;
    if (parsed) {
      entry = String(input.entry).trim();
      level = parsed.level;
      try {
        countryId = await resolveCountryId(parsed.countryCode ?? null);
        stateProvinceId = await resolveStateProvinceId(countryId, parsed.state ?? null);
        cityId = await resolveCityId(countryId, stateProvinceId, parsed.city ?? null);
      } catch {
        /* leave ids null — region simply unattributed */
      }
    }

    const values = {
      capacityDefinitionId,
      organizationId,
      lineOfBusinessCode,
      entry,
      level,
      countryId,
      stateProvinceId,
      cityId,
      subjectType: String(input.subjectType),
      subjectId: input.subjectId,
      exposureAmount: toMoney(input.exposureAmount),
      premiumAmount: input.premiumAmount == null ? null : toMoney(input.premiumAmount),
      currency: input.currency ?? def.currency ?? 'USD',
      status: String(input.status ?? 'bound'),
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      recordedByUserId,
      releasedAt: null,
    };

    const existing = await CapacityUtilizationEntry.findOne({
      where: { capacityDefinitionId, subjectType: values.subjectType, subjectId: values.subjectId },
    });
    if (existing) {
      await existing.update(values);
      return existing;
    }
    return CapacityUtilizationEntry.create(values);
  }

  /** Release a subject's commitment, freeing its capacity but keeping the row. */
  async release(
    organizationId: number,
    capacityDefinitionId: number,
    subjectType: string,
    subjectId: number,
  ): Promise<boolean> {
    const row = await CapacityUtilizationEntry.findOne({
      where: { organizationId, capacityDefinitionId, subjectType, subjectId },
    });
    if (!row) return false;
    await row.update({ status: 'released', releasedAt: new Date() });
    return true;
  }

  async list(organizationId: number, capacityDefinitionId: number): Promise<CapacityUtilizationEntry[]> {
    return CapacityUtilizationEntry.findAll({
      where: { organizationId, capacityDefinitionId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: 500,
    });
  }

  /**
   * Point-in-time utilization for a definition: deployed exposure (active rows)
   * against its gross capacity, with a per-LOB breakdown.
   */
  async summarize(
    organizationId: number,
    capacityDefinitionId: number,
  ): Promise<CapacityUtilizationSummary | null> {
    const def = await CapacityDefinition.findOne({ where: { id: capacityDefinitionId, organizationId } });
    if (!def) return null;

    const active = await CapacityUtilizationEntry.findAll({
      where: { organizationId, capacityDefinitionId, status: { [Op.in]: ACTIVE_STATUSES } },
    });

    let deployed = 0;
    let premium = 0;
    const byLob = new Map<string, { deployed: number; count: number }>();
    for (const row of active) {
      const exposure = Number(row.exposureAmount) || 0;
      deployed += exposure;
      premium += Number(row.premiumAmount ?? 0) || 0;
      const agg = byLob.get(row.lineOfBusinessCode) ?? { deployed: 0, count: 0 };
      agg.deployed += exposure;
      agg.count += 1;
      byLob.set(row.lineOfBusinessCode, agg);
    }

    const grossCapacity = numOrNull(def.grossCapacity);
    const remaining = grossCapacity != null ? grossCapacity - deployed : null;
    const utilizationPct =
      grossCapacity != null && grossCapacity > 0 ? Math.round((deployed / grossCapacity) * 100) : null;

    return {
      capacityDefinitionId,
      currency: def.currency ?? 'USD',
      grossCapacity,
      netRetention: numOrNull(def.netRetention),
      deployed,
      premium,
      remaining,
      utilizationPct,
      activeCount: active.length,
      byLineOfBusiness: [...byLob.entries()]
        .map(([lineOfBusinessCode, v]) => ({ lineOfBusinessCode, deployed: v.deployed, count: v.count }))
        .sort((a, b) => b.deployed - a.deployed),
    };
  }
}
