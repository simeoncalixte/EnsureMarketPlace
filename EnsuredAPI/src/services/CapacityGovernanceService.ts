import {
  CapacityDefinition,
  CapacityAuthorityLevel,
  CapacityReferralRule,
  CapacityRuleSet,
  CapacitySimulation,
  CapacityAuditEntry,
  CapacityLocationLimit,
  CapacityValidationRule,
} from '../db/models';
import { validateRuleConfig, RuleValidationError } from '../pipeline/validation/ruleSchema';
import { RuleEngineRunner, RuleRunResult } from './ruleEngineRunner';
import {
  resolveCityId,
  resolveCountryId,
  resolveStateProvinceId,
} from '../pipeline/locationDiscovery/geography';

export { RuleValidationError } from '../pipeline/validation/ruleSchema';

type ParsedEntry = {
  level: 'country' | 'state' | 'city';
  ref: string;
  countryCode?: string;
  state?: string;
  city?: string;
};

/** Splits an encoded jurisdiction ref (`US`, `US/Florida`, `US/Florida/Tampa`). */
export function parseEntry(entry: string): ParsedEntry | null {
  const raw = String(entry ?? '').trim();
  if (!raw) return null;
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const isCode = (s: string) => /^[A-Za-z]{2}$/.test(s);
  if (parts.length === 1) {
    const isCC = isCode(parts[0]);
    const ref = isCC ? parts[0].toUpperCase() : parts[0];
    return { level: 'country', ref, countryCode: isCC ? ref : undefined };
  }
  if (parts.length === 2) {
    return { level: 'state', ref: parts[1], countryCode: parts[0].toUpperCase(), state: parts[1] };
  }
  return { level: 'city', ref: parts[2], countryCode: parts[0].toUpperCase(), state: parts[1], city: parts[2] };
}

/** Normalize a money input to a string DECIMAL, or null when blank/invalid. */
function normMoney(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(n) : null;
}

/** Normalize a trimmed string, or null when blank. */
function normStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

/** Normalize an ISO date (YYYY-MM-DD), or null when blank/invalid. */
function normDate(value: unknown): string | null {
  const s = normStr(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : s.slice(0, 10);
}

/**
 * CapacityGovernanceService — CRUD + lifecycle for the Capacity Configuration
 * Form domain. Every mutation to a capacity definition records an immutable
 * audit entry (Section 17) carrying a full snapshot, which doubles as the
 * version history for rollback / side-by-side comparison (Section 19).
 */

// Columns settable from a request body. id/organizationId/audit columns are
// managed server-side and are deliberately excluded.
const DEFINITION_FIELDS = [
  'name', 'code', 'description', 'status', 'effectiveDate', 'expirationDate', 'versionNumber',
  'grossCapacity', 'netRetention', 'currency', 'capacityPeriodBasis',
  'deploymentStatus', 'isActive',
  'lineOfBusiness', 'department', 'team', 'ownerUserId', 'backupOwnerUserId', 'riskManagerUserId', 'approvalCommittee',
  'geographicControls', 'riskEligibility', 'exposureConstraints', 'portfolioControls', 'accumulationControls',
  'pricingControls', 'coverageControls', 'distributionControls', 'riskScoring', 'workflowConfig', 'appetite',
] as const;

const VALIDATION_RULE_FIELDS = ['name', 'description', 'field', 'operator', 'value', 'severity', 'enabled', 'sortOrder'] as const;

const LOCATION_LIMIT_FIELDS = [
  'entry', 'lineOfBusinessCode', 'maxLineSize', 'aggregateLimit', 'perOccurrenceLimit',
  'appetiteStance', 'minimumPremium', 'minRateOnLine', 'referralThreshold',
  'effectiveFrom', 'effectiveTo', 'currency', 'enabled',
] as const;

const AUTHORITY_FIELDS = [
  'name', 'maxPremiumAuthority', 'maxExposureAuthority', 'maxPricingDeviation',
  'maxDiscountAuthority', 'maxCreditAuthority', 'referralThreshold', 'sortOrder',
] as const;

const REFERRAL_FIELDS = [
  'name', 'description', 'severity', 'triggerConditions', 'referralDestinationType',
  'referralDestinationId', 'activeFlag', 'sortOrder',
] as const;

const RULESET_FIELDS = ['name', 'description', 'rootCondition', 'subjectModel', 'actions', 'outcome', 'enabled', 'sortOrder'] as const;

const SIMULATION_FIELDS = ['capacityDefinitionId', 'name', 'simulationType', 'inputParams'] as const;

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  }
  return out;
}

export class CapacityGovernanceService {
  // ─── Capacity definitions (spine) ──────────────────────────────────────────

  async listDefinitions(organizationId: number): Promise<CapacityDefinition[]> {
    return CapacityDefinition.findAll({
      where: { organizationId },
      order: [['isActive', 'DESC'], ['name', 'ASC'], ['id', 'ASC']],
    });
  }

  async getDefinition(organizationId: number, id: number): Promise<CapacityDefinition | null> {
    return CapacityDefinition.findOne({
      where: { id, organizationId },
      include: [
        { model: CapacityAuthorityLevel, as: 'authorityLevels' },
        { model: CapacityReferralRule, as: 'referralRules' },
        { model: CapacityRuleSet, as: 'ruleSets' },
      ],
    });
  }

  async createDefinition(
    organizationId: number,
    input: Record<string, unknown>,
    userId: number | null = null,
  ): Promise<CapacityDefinition> {
    const patch = pick(input, DEFINITION_FIELDS);
    const created = await CapacityDefinition.create({
      organizationId,
      name: String(patch.name ?? 'Untitled Capacity'),
      ...patch,
      createdByUserId: userId,
      lastModifiedByUserId: userId,
    } as any);
    await this.recordAudit(created, 'created', input.changeReason as string | undefined, userId);
    return created;
  }

  async updateDefinition(
    organizationId: number,
    id: number,
    input: Record<string, unknown>,
    userId: number | null = null,
  ): Promise<CapacityDefinition | null> {
    const def = await CapacityDefinition.findOne({ where: { id, organizationId } });
    if (!def) return null;
    const patch = pick(input, DEFINITION_FIELDS);
    await def.update({ ...patch, lastModifiedByUserId: userId } as any);
    await this.recordAudit(def, 'updated', input.changeReason as string | undefined, userId);
    return this.getDefinition(organizationId, id);
  }

  /**
   * Lifecycle transition (Sections 1 & 19). Stamps approval metadata when moving
   * into an approved/active state, and flips the single active definition.
   */
  async transitionDefinition(
    organizationId: number,
    id: number,
    input: { status?: string; deploymentStatus?: string; changeReason?: string },
    userId: number | null = null,
  ): Promise<CapacityDefinition | null> {
    const def = await CapacityDefinition.findOne({ where: { id, organizationId } });
    if (!def) return null;

    const patch: Record<string, unknown> = { lastModifiedByUserId: userId };
    if (input.status) patch.status = input.status;
    if (input.deploymentStatus) patch.deploymentStatus = input.deploymentStatus;
    if (input.changeReason) patch.changeReason = input.changeReason;

    const becomingActive = input.status === 'active' || input.deploymentStatus === 'active';
    if (becomingActive) {
      patch.isActive = true;
      patch.approvedByUserId = userId;
      patch.approvalDate = new Date();
      // Only one active definition per org — demote the others.
      await CapacityDefinition.update(
        { isActive: false },
        { where: { organizationId, isActive: true } },
      );
    } else if (input.status === 'retired' || input.status === 'suspended') {
      patch.isActive = false;
    }

    await def.update(patch as any);
    await this.recordAudit(def, `transition:${input.status ?? input.deploymentStatus ?? 'unknown'}`, input.changeReason, userId);
    return this.getDefinition(organizationId, id);
  }

  /** Clone a definition as a new draft (Section 19: draft versions / side-by-side). */
  async cloneDefinition(
    organizationId: number,
    id: number,
    userId: number | null = null,
  ): Promise<CapacityDefinition | null> {
    const src = await CapacityDefinition.findOne({ where: { id, organizationId } });
    if (!src) return null;
    const data = src.toJSON() as Record<string, unknown>;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const clone = await CapacityDefinition.create({
      ...data,
      name: `${src.name} (copy)`,
      code: src.code ? `${src.code}-COPY` : null,
      status: 'draft',
      deploymentStatus: 'draft',
      isActive: false,
      clonedFromId: id,
      versionNumber: bumpVersion(src.versionNumber),
      approvedByUserId: null,
      approvalDate: null,
      createdByUserId: userId,
      lastModifiedByUserId: userId,
    } as any);
    await this.recordAudit(clone, `cloned_from:${id}`, undefined, userId);
    return clone;
  }

  async deleteDefinition(organizationId: number, id: number): Promise<boolean> {
    const def = await CapacityDefinition.findOne({ where: { id, organizationId } });
    if (!def) return false;
    await def.destroy();
    return true;
  }

  // ─── Audit trail (Section 17) ───────────────────────────────────────────────

  private async recordAudit(
    def: CapacityDefinition,
    action: string,
    changeReason: string | undefined,
    userId: number | null,
  ): Promise<void> {
    await CapacityAuditEntry.create({
      capacityDefinitionId: def.id,
      organizationId: def.organizationId,
      action,
      versionNumber: def.versionNumber,
      changeReason: changeReason ?? null,
      snapshot: def.toJSON() as Record<string, unknown>,
      changedByUserId: userId,
    });
  }

  async listAudit(organizationId: number, capacityDefinitionId?: number): Promise<CapacityAuditEntry[]> {
    return CapacityAuditEntry.findAll({
      where: { organizationId, ...(capacityDefinitionId ? { capacityDefinitionId } : {}) },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: 500,
    });
  }

  // ─── Generic ordered-child CRUD (authority, referral, ruleset) ──────────────

  private async assertDefinition(organizationId: number, capacityDefinitionId: number): Promise<boolean> {
    const def = await CapacityDefinition.findOne({ where: { id: capacityDefinitionId, organizationId } });
    return !!def;
  }

  async listAuthorityLevels(organizationId: number, defId: number): Promise<CapacityAuthorityLevel[]> {
    return CapacityAuthorityLevel.findAll({
      where: { organizationId, capacityDefinitionId: defId },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async createAuthorityLevel(organizationId: number, defId: number, input: Record<string, unknown>): Promise<CapacityAuthorityLevel | null> {
    if (!(await this.assertDefinition(organizationId, defId))) return null;
    const patch = pick(input, AUTHORITY_FIELDS);
    return CapacityAuthorityLevel.create({
      organizationId,
      capacityDefinitionId: defId,
      name: String(patch.name ?? 'Untitled level'),
      ...patch,
    } as any);
  }

  async updateAuthorityLevel(organizationId: number, id: number, input: Record<string, unknown>): Promise<CapacityAuthorityLevel | null> {
    const row = await CapacityAuthorityLevel.findOne({ where: { id, organizationId } });
    if (!row) return null;
    await row.update(pick(input, AUTHORITY_FIELDS) as any);
    return row;
  }

  async deleteAuthorityLevel(organizationId: number, id: number): Promise<boolean> {
    const row = await CapacityAuthorityLevel.findOne({ where: { id, organizationId } });
    if (!row) return false;
    await row.destroy();
    return true;
  }

  async listReferralRules(organizationId: number, defId: number): Promise<CapacityReferralRule[]> {
    return CapacityReferralRule.findAll({
      where: { organizationId, capacityDefinitionId: defId },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async createReferralRule(organizationId: number, defId: number, input: Record<string, unknown>): Promise<CapacityReferralRule | null> {
    if (!(await this.assertDefinition(organizationId, defId))) return null;
    const patch = pick(input, REFERRAL_FIELDS);
    return CapacityReferralRule.create({
      organizationId,
      capacityDefinitionId: defId,
      name: String(patch.name ?? 'Untitled referral'),
      ...patch,
    } as any);
  }

  async updateReferralRule(organizationId: number, id: number, input: Record<string, unknown>): Promise<CapacityReferralRule | null> {
    const row = await CapacityReferralRule.findOne({ where: { id, organizationId } });
    if (!row) return null;
    await row.update(pick(input, REFERRAL_FIELDS) as any);
    return row;
  }

  async deleteReferralRule(organizationId: number, id: number): Promise<boolean> {
    const row = await CapacityReferralRule.findOne({ where: { id, organizationId } });
    if (!row) return false;
    await row.destroy();
    return true;
  }

  async listRuleSets(organizationId: number, defId: number): Promise<CapacityRuleSet[]> {
    return CapacityRuleSet.findAll({
      where: { organizationId, capacityDefinitionId: defId },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async createRuleSet(organizationId: number, defId: number, input: Record<string, unknown>): Promise<CapacityRuleSet | null> {
    if (!(await this.assertDefinition(organizationId, defId))) return null;
    const patch = pick(input, RULESET_FIELDS);
    return CapacityRuleSet.create({
      organizationId,
      capacityDefinitionId: defId,
      name: String(patch.name ?? 'Untitled rule set'),
      ...patch,
    } as any);
  }

  async updateRuleSet(organizationId: number, id: number, input: Record<string, unknown>): Promise<CapacityRuleSet | null> {
    const row = await CapacityRuleSet.findOne({ where: { id, organizationId } });
    if (!row) return null;
    await row.update(pick(input, RULESET_FIELDS) as any);
    return row;
  }

  async deleteRuleSet(organizationId: number, id: number): Promise<boolean> {
    const row = await CapacityRuleSet.findOne({ where: { id, organizationId } });
    if (!row) return false;
    await row.destroy();
    return true;
  }

  /**
   * Executes a rule set against one subject record, organization-scoped. Defaults
   * to a dry run (no commits); pass `dryRun: false` to apply CRUD/calculations
   * live. Returns null when the rule set isn't found in this organization.
   */
  async runRuleSet(
    organizationId: number,
    id: number,
    subjectId: number,
    opts: { dryRun?: boolean } = {},
  ): Promise<RuleRunResult | null> {
    const row = await CapacityRuleSet.findOne({ where: { id, organizationId } });
    if (!row) return null;
    return new RuleEngineRunner().run(organizationId, row, subjectId, opts);
  }

  // ─── Simulations (Section 18) ───────────────────────────────────────────────

  async listSimulations(organizationId: number): Promise<CapacitySimulation[]> {
    return CapacitySimulation.findAll({
      where: { organizationId },
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: 200,
    });
  }

  /**
   * Records and "runs" a simulation. The harness is intentionally lightweight —
   * it produces a structured, deterministic forecast envelope so the UI has real
   * results to render; richer modeling can plug into the same record later.
   */
  async runSimulation(organizationId: number, input: Record<string, unknown>, userId: number | null = null): Promise<CapacitySimulation> {
    const patch = pick(input, SIMULATION_FIELDS);
    const sim = await CapacitySimulation.create({
      organizationId,
      name: String(patch.name ?? 'Untitled simulation'),
      simulationType: String(patch.simulationType ?? 'capacity_simulation'),
      capacityDefinitionId: (patch.capacityDefinitionId as number) ?? null,
      inputParams: (patch.inputParams as Record<string, unknown>) ?? {},
      status: 'completed',
      ranByUserId: userId,
      ranAt: new Date(),
      results: summarizeSimulation(String(patch.simulationType ?? 'capacity_simulation'), (patch.inputParams as Record<string, unknown>) ?? {}),
    } as any);
    return sim;
  }

  async deleteSimulation(organizationId: number, id: number): Promise<boolean> {
    const row = await CapacitySimulation.findOne({ where: { id, organizationId } });
    if (!row) return false;
    await row.destroy();
    return true;
  }

  // ─── Appetite validation rules (flat field/operator/value/severity) ─────────
  // Mirrors the legacy organizationValidationRules; these feed the validation
  // pipeline's evaluateCustomRules via loadAppetiteForTenant.

  async listValidationRules(organizationId: number, defId: number): Promise<CapacityValidationRule[]> {
    return CapacityValidationRule.findAll({
      where: { organizationId, capacityDefinitionId: defId },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async createValidationRule(organizationId: number, defId: number, input: Record<string, unknown>): Promise<CapacityValidationRule | null> {
    if (!(await this.assertDefinition(organizationId, defId))) return null;
    const patch = pick(input, VALIDATION_RULE_FIELDS);
    const effective = {
      field: String(patch.field ?? ''),
      operator: String(patch.operator ?? 'required'),
      value: patch.value ?? null,
      severity: String(patch.severity ?? 'flag'),
    };
    const issues = validateRuleConfig(effective);
    if (issues.length > 0) throw new RuleValidationError(issues);

    return CapacityValidationRule.create({
      capacityDefinitionId: defId,
      organizationId,
      name: String(patch.name ?? 'Untitled rule'),
      field: effective.field,
      operator: effective.operator,
      value: effective.value,
      severity: effective.severity,
      enabled: (patch.enabled as boolean) ?? true,
      sortOrder: (patch.sortOrder as number) ?? 100,
      description: (patch.description as string | null) ?? null,
    });
  }

  async updateValidationRule(organizationId: number, ruleId: number, input: Record<string, unknown>): Promise<CapacityValidationRule | null> {
    const rule = await CapacityValidationRule.findOne({ where: { id: ruleId, organizationId } });
    if (!rule) return null;
    const patch = pick(input, VALIDATION_RULE_FIELDS);
    const issues = validateRuleConfig({
      field: 'field' in patch ? (patch.field as string) : rule.field,
      operator: 'operator' in patch ? (patch.operator as string) : rule.operator,
      value: 'value' in patch ? patch.value : rule.value,
      severity: 'severity' in patch ? (patch.severity as string) : rule.severity,
    });
    if (issues.length > 0) throw new RuleValidationError(issues);
    await rule.update(patch as any);
    return rule;
  }

  async deleteValidationRule(organizationId: number, ruleId: number): Promise<boolean> {
    const rule = await CapacityValidationRule.findOne({ where: { id: ruleId, organizationId } });
    if (!rule) return false;
    await rule.destroy();
    return true;
  }

  // ─── Per-location limits (LOB × location) ────────────────────────────────────

  async listLocationLimits(organizationId: number, defId: number): Promise<CapacityLocationLimit[]> {
    return CapacityLocationLimit.findAll({
      where: { organizationId, capacityDefinitionId: defId },
      order: [['entry', 'ASC'], ['lineOfBusinessCode', 'ASC']],
    });
  }

  /**
   * Upsert one location limit, keyed by (capacityDefinitionId, lineOfBusinessCode,
   * entry). Resolves the encoded entry to geography ids (best-effort). Clearing
   * both caps removes the row.
   */
  async upsertLocationLimit(
    organizationId: number,
    defId: number,
    input: Record<string, unknown>,
    createdByUserId: number | null = null,
  ): Promise<CapacityLocationLimit | null> {
    if (!(await this.assertDefinition(organizationId, defId))) return null;
    const patch = pick(input, LOCATION_LIMIT_FIELDS);
    const parsed = parseEntry(String(patch.entry ?? ''));
    if (!parsed) throw new Error('invalid_entry');

    const lineOfBusinessCode = String(patch.lineOfBusinessCode ?? '*').trim() || '*';
    const maxLineSize = normMoney(patch.maxLineSize as string | number | null | undefined);
    const aggregateLimit = normMoney(patch.aggregateLimit as string | number | null | undefined);
    const perOccurrenceLimit = normMoney(patch.perOccurrenceLimit as string | number | null | undefined);
    const minimumPremium = normMoney(patch.minimumPremium as string | number | null | undefined);
    const minRateOnLine = normMoney(patch.minRateOnLine as string | number | null | undefined);
    const referralThreshold = normMoney(patch.referralThreshold as string | number | null | undefined);
    const appetiteStance = normStr(patch.appetiteStance);
    const effectiveFrom = normDate(patch.effectiveFrom);
    const effectiveTo = normDate(patch.effectiveTo);
    const entry = String(patch.entry).trim();

    const where = { capacityDefinitionId: defId, lineOfBusinessCode, entry };
    const existing = await CapacityLocationLimit.findOne({ where });

    // The row exists only to carry overrides — if every override is cleared, drop it.
    const hasOverride = [
      maxLineSize, aggregateLimit, perOccurrenceLimit, minimumPremium, minRateOnLine,
      referralThreshold, appetiteStance, effectiveFrom, effectiveTo,
    ].some((v) => v != null);
    if (!hasOverride) {
      if (existing) await existing.destroy();
      return null;
    }

    let countryId: number | null = null;
    let stateProvinceId: number | null = null;
    let cityId: number | null = null;
    try {
      countryId = await resolveCountryId(parsed.countryCode ?? null);
      stateProvinceId = await resolveStateProvinceId(countryId, parsed.state ?? null);
      cityId = await resolveCityId(countryId, stateProvinceId, parsed.city ?? null);
    } catch {
      /* leave ids null — capacity simply reports 0 deployed */
    }

    const values = {
      capacityDefinitionId: defId,
      organizationId,
      lineOfBusinessCode,
      entry,
      level: parsed.level,
      countryId,
      stateProvinceId,
      cityId,
      maxLineSize,
      aggregateLimit,
      perOccurrenceLimit,
      minimumPremium,
      minRateOnLine,
      referralThreshold,
      appetiteStance,
      effectiveFrom,
      effectiveTo,
      currency: (patch.currency as string) ?? 'USD',
      enabled: (patch.enabled as boolean) ?? true,
      createdByUserId,
    };

    if (existing) {
      await existing.update(values);
      return existing;
    }
    return CapacityLocationLimit.create(values);
  }

  async deleteLocationLimit(organizationId: number, limitId: number): Promise<boolean> {
    const limit = await CapacityLocationLimit.findOne({ where: { id: limitId, organizationId } });
    if (!limit) return false;
    await limit.destroy();
    return true;
  }
}

/** Bump the minor component of a semver-ish version string. */
function bumpVersion(version: string | null | undefined): string {
  const parts = String(version ?? '1.0.0').split('.');
  const minor = Number(parts[1] ?? '0');
  return `${parts[0] ?? '1'}.${Number.isFinite(minor) ? minor + 1 : 1}.0`;
}

/** Deterministic placeholder forecast so the simulation UI renders real output. */
function summarizeSimulation(type: string, params: Record<string, unknown>): Record<string, unknown> {
  const exposure = Number(params.exposure ?? params.notional ?? 0) || 0;
  const utilizationPct = exposure > 0 ? Math.min(100, Math.round((exposure / (Number(params.capacity ?? exposure * 4) || 1)) * 100)) : 0;
  return {
    type,
    evaluatedAt: new Date().toISOString(),
    projectedUtilizationPct: utilizationPct,
    projectedExposure: exposure,
    withinAppetite: utilizationPct <= 100,
    notes: 'Deterministic forecast envelope. Connect a modeling backend to refine.',
  };
}
