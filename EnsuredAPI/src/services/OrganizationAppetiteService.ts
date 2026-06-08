import {
  OrganizationAppetiteProfile,
  OrganizationValidationRule,
} from '../db/models';
import { validateRuleConfig, RuleValidationError } from '../pipeline/validation/ruleSchema';

export { RuleValidationError } from '../pipeline/validation/ruleSchema';

export type AppetiteProfileInput = {
  name?: string;
  description?: string | null;
  status?: string;
  currency?: string;
  totalDeployableCapital?: string | number | null;
  minTargetYield?: string | number | null;
  maxLineSize?: string | number | null;
  minCoverageLimit?: string | number | null;
  maxCoverageLimit?: string | number | null;
  capacityByPeril?: Record<string, number>;
  preferredPerils?: string[];
  excludedPerils?: string[];
  allowedLinesOfBusiness?: string[];
  preferredJurisdictions?: string[];
  excludedJurisdictions?: string[];
  minDataQualityScore?: number | null;
  requiredFields?: string[];
};

export type ValidationRuleInput = {
  name?: string;
  description?: string | null;
  field?: string;
  operator?: string;
  value?: unknown;
  severity?: string;
  enabled?: boolean;
  sortOrder?: number;
};

// Only these columns can be set from request bodies — id/organizationId/timestamps
// are managed server-side.
const PROFILE_FIELDS: Array<keyof AppetiteProfileInput> = [
  'name', 'description', 'status', 'currency', 'totalDeployableCapital', 'minTargetYield',
  'maxLineSize', 'minCoverageLimit', 'maxCoverageLimit', 'capacityByPeril', 'preferredPerils',
  'excludedPerils', 'allowedLinesOfBusiness', 'preferredJurisdictions', 'excludedJurisdictions',
  'minDataQualityScore', 'requiredFields',
];

const RULE_FIELDS: Array<keyof ValidationRuleInput> = [
  'name', 'description', 'field', 'operator', 'value', 'severity', 'enabled', 'sortOrder',
];

function pick<T extends object>(source: Record<string, unknown>, keys: Array<keyof T>): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key as string)) {
      out[key as string] = source[key as string];
    }
  }
  return out as Partial<T>;
}

export class OrganizationAppetiteService {
  /**
   * Returns the organization's default appetite profile (with its rules),
   * lazily creating a blank default if none exists yet.
   */
  async getProfile(organizationId: number, createdByUserId: number | null = null): Promise<OrganizationAppetiteProfile> {
    let profile = await OrganizationAppetiteProfile.findOne({
      where: { organizationId },
      order: [['isDefault', 'DESC'], ['id', 'ASC']],
      include: [{ model: OrganizationValidationRule, as: 'rules' }],
    });

    if (!profile) {
      profile = await OrganizationAppetiteProfile.create({
        organizationId,
        name: 'Default Appetite',
        isDefault: true,
        createdByUserId,
      });
      profile = await OrganizationAppetiteProfile.findByPk(profile.id, {
        include: [{ model: OrganizationValidationRule, as: 'rules' }],
      });
    }

    return profile as OrganizationAppetiteProfile;
  }

  async upsertProfile(
    organizationId: number,
    input: AppetiteProfileInput,
    createdByUserId: number | null = null,
  ): Promise<OrganizationAppetiteProfile> {
    const profile = await this.getProfile(organizationId, createdByUserId);
    const patch = pick<AppetiteProfileInput>(input as Record<string, unknown>, PROFILE_FIELDS);
    await profile.update(patch as any);
    return this.getProfile(organizationId, createdByUserId);
  }

  async listRules(organizationId: number): Promise<OrganizationValidationRule[]> {
    const profile = await this.getProfile(organizationId);
    return OrganizationValidationRule.findAll({
      where: { appetiteProfileId: profile.id },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async createRule(organizationId: number, input: ValidationRuleInput): Promise<OrganizationValidationRule> {
    const profile = await this.getProfile(organizationId);
    const patch = pick<ValidationRuleInput>(input as Record<string, unknown>, RULE_FIELDS);

    const effective = {
      field: String(patch.field ?? ''),
      operator: String(patch.operator ?? 'required'),
      value: patch.value ?? null,
      severity: String(patch.severity ?? 'flag'),
    };
    const issues = validateRuleConfig(effective);
    if (issues.length > 0) throw new RuleValidationError(issues);

    return OrganizationValidationRule.create({
      appetiteProfileId: profile.id,
      organizationId,
      name: String(patch.name ?? 'Untitled rule'),
      field: effective.field,
      operator: effective.operator,
      value: effective.value,
      severity: effective.severity,
      enabled: patch.enabled ?? true,
      sortOrder: patch.sortOrder ?? 100,
      description: patch.description ?? null,
    });
  }

  async updateRule(
    organizationId: number,
    ruleId: number,
    input: ValidationRuleInput,
  ): Promise<OrganizationValidationRule | null> {
    const rule = await OrganizationValidationRule.findOne({ where: { id: ruleId, organizationId } });
    if (!rule) return null;
    const patch = pick<ValidationRuleInput>(input as Record<string, unknown>, RULE_FIELDS);

    // Validate the effective config (existing values merged with the patch) so
    // partial updates — e.g. just toggling `enabled` — never trip validation,
    // while a changed field/operator/value is still checked before it persists.
    const issues = validateRuleConfig({
      field: 'field' in patch ? patch.field : rule.field,
      operator: 'operator' in patch ? patch.operator : rule.operator,
      value: 'value' in patch ? patch.value : rule.value,
      severity: 'severity' in patch ? patch.severity : rule.severity,
    });
    if (issues.length > 0) throw new RuleValidationError(issues);

    await rule.update(patch as any);
    return rule;
  }

  async deleteRule(organizationId: number, ruleId: number): Promise<boolean> {
    const rule = await OrganizationValidationRule.findOne({ where: { id: ruleId, organizationId } });
    if (!rule) return false;
    await rule.destroy();
    return true;
  }
}
