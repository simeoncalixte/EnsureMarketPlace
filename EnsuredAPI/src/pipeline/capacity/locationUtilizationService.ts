import { Op } from 'sequelize';
import { CapacityLocationLimit, InsurerProfile, Policy } from '../../db/models';

/**
 * Capacity-utilization layer: for each per-location appetite limit, compute how
 * much of its regional aggregate cap is consumed by deployed exposure, so the map
 * can render a utilization heatmap.
 *
 * Deployed = bound + in-flight:
 *  - bound: SUM of `coverageLimit` (fallback `insuredValue`) of in-force policies
 *    matching the limit's region (by resolved geography id, per level) and line of
 *    business. Real and summable.
 *  - in-flight: pre-bind exposure. The current schema has no geography/LOB on
 *    pre-bind quotes/submissions (policies exist only post-bind), so this is
 *    reported as 0 with a warning — structurally present so it lights up the moment
 *    quotes carry geography. Never fabricated.
 *
 * Mirrors the injectable-loader pattern of `CapacityMatchService` so the math is
 * unit-testable without a database.
 */

const BOUND_POLICY_STATUSES = ['in_force'];

export type LocationUtilization = {
  entry: string;
  level: 'country' | 'state' | 'city';
  lineOfBusinessCode: string;
  currency: string;
  aggregateLimit: number | null;
  maxLineSize: number | null;
  boundExposure: number;
  inFlightExposure: number;
  deployed: number;
  /** deployed ÷ aggregateLimit as a 0–100 integer, or null when no cap is set. */
  utilizationPct: number | null;
};

export type CapacityLayer = { regions: LocationUtilization[]; warnings: string[] };

/** Resolves bound exposure ($) for a single region+LOB. Injectable for tests. */
export type BoundExposureLoader = (args: {
  organizationId: number;
  level: 'country' | 'state' | 'city';
  countryId: number | null;
  stateProvinceId: number | null;
  cityId: number | null;
  lineOfBusinessCode: string;
}) => Promise<number>;

/** Default loader: sums in-force policies for the org, region and LOB from the DB. */
export const defaultBoundExposureLoader: BoundExposureLoader = async (args) => {
  // Region must be resolvable to a geography id, else we cannot attribute exposure.
  const regionWhere: Record<string, unknown> = {};
  if (args.level === 'country') {
    if (!args.countryId) return 0;
    regionWhere.countryId = args.countryId;
  } else if (args.level === 'state') {
    if (!args.stateProvinceId) return 0;
    regionWhere.stateProvinceId = args.stateProvinceId;
  } else {
    if (!args.cityId) return 0;
    regionWhere.cityId = args.cityId;
  }

  const profiles = await InsurerProfile.findAll({ where: { organizationId: args.organizationId }, attributes: ['id'] });
  const insurerProfileIds = profiles.map((p) => p.id);
  if (insurerProfileIds.length === 0) return 0;

  const base: Record<string, unknown> = {
    insurerProfileId: { [Op.in]: insurerProfileIds },
    status: { [Op.in]: BOUND_POLICY_STATUSES },
    ...regionWhere,
  };
  if (args.lineOfBusinessCode !== '*') base.lineOfBusinessCode = args.lineOfBusinessCode;

  // SUM(coverageLimit) over rows that have one, plus SUM(insuredValue) where it is null.
  const cov = (await Policy.sum('coverageLimit', { where: base })) || 0;
  const insFallback = (await Policy.sum('insuredValue', { where: { ...base, coverageLimit: null } })) || 0;
  return Number(cov) + Number(insFallback);
};

export class LocationCapacityService {
  private readonly loadBound: BoundExposureLoader;

  constructor(deps: { loadBound?: BoundExposureLoader } = {}) {
    this.loadBound = deps.loadBound ?? defaultBoundExposureLoader;
  }

  async computeUtilization(
    organizationId: number,
    opts: { lineOfBusinessCode?: string } = {},
  ): Promise<CapacityLayer> {
    const warnings: string[] = [];
    const limits = await CapacityLocationLimit.findAll({
      where: { organizationId, enabled: true },
      order: [['entry', 'ASC']],
    });

    // Filter by the requested LOB; a `'*'` (all-lines) limit always applies.
    const lob = opts.lineOfBusinessCode;
    const selected = lob ? limits.filter((l) => l.lineOfBusinessCode === lob || l.lineOfBusinessCode === '*') : limits;

    const regions: LocationUtilization[] = [];
    for (const limit of selected) {
      const boundExposure = await this.loadBound({
        organizationId,
        level: limit.level,
        countryId: limit.countryId,
        stateProvinceId: limit.stateProvinceId,
        cityId: limit.cityId,
        lineOfBusinessCode: limit.lineOfBusinessCode,
      });
      const inFlightExposure = 0;
      const deployed = boundExposure + inFlightExposure;
      const aggregateLimit = limit.aggregateLimit != null ? Number(limit.aggregateLimit) : null;
      regions.push({
        entry: limit.entry,
        level: limit.level,
        lineOfBusinessCode: limit.lineOfBusinessCode,
        currency: limit.currency,
        aggregateLimit,
        maxLineSize: limit.maxLineSize != null ? Number(limit.maxLineSize) : null,
        boundExposure,
        inFlightExposure,
        deployed,
        utilizationPct:
          aggregateLimit && aggregateLimit > 0 ? Math.round((deployed / aggregateLimit) * 100) : null,
      });
    }

    if (selected.some((l) => l.aggregateLimit != null)) {
      warnings.push(
        'in-flight exposure unavailable: pre-bind quotes/submissions carry no geography or line of business in the current schema; only bound (in_force) policy exposure is counted',
      );
    }

    return { regions, warnings };
  }
}
