// Governance / Capacity Configuration API client.
// Requests under `/api/organizations/{id}/governance/...`, mirroring organizations.ts.
import { getJson, postJson, putJson, deleteJson } from './client';

// ─── Option sets (every Governance list is seeded server-side, never hardcoded) ──
export interface OptionItem {
  value: string;
  label: string;
}
export interface OptionSet {
  optionSetKey: string;
  label: string | null;
  items: OptionItem[];
}

export function getGovernanceOptionSet(organizationId: number, key: string): Promise<OptionSet> {
  return getJson<OptionSet>(`/api/organizations/${organizationId}/governance/option-sets/${encodeURIComponent(key)}`);
}

// ─── Rules-engine condition tree (Section 15) ──
export interface RuleConditionNode {
  connector?: 'AND' | 'OR' | 'NOT';
  conditions?: RuleConditionNode[];
  field?: string;
  operator?: string;
  value?: unknown;
}

// ─── Model field catalog (dot-notation paths over the real DB models) ──
export type CatalogFieldKind = 'text' | 'number' | 'boolean' | 'date' | 'json' | 'uuid';
export interface CatalogField {
  path: string;
  label: string;
  kind: CatalogFieldKind;
  nullable: boolean;
  via?: string;
}
export interface CatalogModel {
  key: string;
  model: string;
  table: string;
  fields: CatalogField[];
}
export interface ModelFieldCatalog {
  organizationId: number;
  models: CatalogModel[];
}

export function getModelFieldCatalog(organizationId: number): Promise<ModelFieldCatalog> {
  return getJson<ModelFieldCatalog>(`/api/organizations/${organizationId}/governance/model-catalog`);
}

// ─── Capacity definition (spine) ──
export interface CapacityDefinition {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  versionNumber: string;
  deploymentStatus: string;
  isActive: boolean;
  lineOfBusiness: string | null;
  department: string | null;
  team: string | null;
  ownerUserId: number | null;
  backupOwnerUserId: number | null;
  riskManagerUserId: number | null;
  approvalCommittee: number[];
  geographicControls: Record<string, unknown>;
  riskEligibility: Record<string, unknown>;
  exposureConstraints: Record<string, unknown>;
  portfolioControls: Record<string, unknown>;
  accumulationControls: Record<string, unknown>;
  pricingControls: Record<string, unknown>;
  coverageControls: Record<string, unknown>;
  distributionControls: Record<string, unknown>;
  riskScoring: Record<string, unknown>;
  workflowConfig: Record<string, unknown>;
  appetite: Record<string, unknown>;
  createdByUserId: number | null;
  lastModifiedByUserId: number | null;
  approvedByUserId: number | null;
  approvalDate: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
  authorityLevels?: AuthorityLevel[];
  referralRules?: ReferralRule[];
  ruleSets?: RuleSet[];
}

export type CapacityDefinitionPatch = Partial<
  Omit<CapacityDefinition, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'authorityLevels' | 'referralRules' | 'ruleSets'>
> & { changeReason?: string };

export interface AuthorityLevel {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  name: string;
  maxPremiumAuthority: string | null;
  maxExposureAuthority: string | null;
  maxPricingDeviation: string | null;
  maxDiscountAuthority: string | null;
  maxCreditAuthority: string | null;
  referralThreshold: string | null;
  sortOrder: number;
}
export type AuthorityLevelInput = Partial<Omit<AuthorityLevel, 'id' | 'capacityDefinitionId' | 'organizationId'>>;

export interface ReferralRule {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  name: string;
  description: string | null;
  severity: string;
  triggerConditions: RuleConditionNode | Record<string, unknown>;
  referralDestinationType: string | null;
  referralDestinationId: string | null;
  activeFlag: boolean;
  sortOrder: number;
}
export type ReferralRuleInput = Partial<Omit<ReferralRule, 'id' | 'capacityDefinitionId' | 'organizationId'>>;

// ─── Rule outcome actions (the THEN side) — simple CRUD against catalog models ──
export type RuleActionType = 'modify' | 'create' | 'update' | 'delete';
export type ValueSource =
  | { mode: 'literal'; value: unknown }
  | { mode: 'expression'; expression: string };
export interface RuleAssignment {
  path: string;
  source: ValueSource;
}
export interface RuleAction {
  id?: string;
  type: RuleActionType;
  targetModel?: string;
  assignments?: RuleAssignment[];
  match?: RuleConditionNode;
}

export interface RuleSet {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  name: string;
  description: string | null;
  rootCondition: RuleConditionNode;
  subjectModel: string | null;
  actions: RuleAction[];
  outcome: string | null;
  enabled: boolean;
  sortOrder: number;
}
export type RuleSetInput = Partial<Omit<RuleSet, 'id' | 'capacityDefinitionId' | 'organizationId'>>;

// ─── Rule execution (live, org-scoped; dry-run by default) ──
export interface RuleActionResult {
  type: RuleActionType;
  status: 'applied' | 'previewed' | 'skipped' | 'error';
  detail: string;
  before?: unknown;
  after?: unknown;
  affected?: number;
}
export interface RuleRunResult {
  ruleSetId: number;
  subjectModel: string;
  subjectId: number;
  dryRun: boolean;
  subjectFound: boolean;
  matched: boolean;
  actions: RuleActionResult[];
  warnings: string[];
}

export interface Simulation {
  id: number;
  capacityDefinitionId: number | null;
  organizationId: number;
  name: string;
  simulationType: string;
  inputParams: Record<string, unknown>;
  results: Record<string, unknown> | null;
  status: string;
  ranByUserId: number | null;
  ranAt: string | null;
  createdAt: string;
}
export interface SimulationInput {
  name: string;
  simulationType: string;
  capacityDefinitionId?: number | null;
  inputParams?: Record<string, unknown>;
}

export interface AuditEntry {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  action: string;
  versionNumber: string | null;
  changeReason: string | null;
  snapshot: Record<string, unknown>;
  changedByUserId: number | null;
  createdAt: string;
}

const base = (orgId: number) => `/api/organizations/${orgId}/governance`;

// ── Definitions ──
export const listCapacityDefinitions = (orgId: number) =>
  getJson<CapacityDefinition[]>(`${base(orgId)}/capacity-definitions`);
export const getCapacityDefinition = (orgId: number, defId: number) =>
  getJson<CapacityDefinition>(`${base(orgId)}/capacity-definitions/${defId}`);
export const createCapacityDefinition = (orgId: number, input: CapacityDefinitionPatch) =>
  postJson<CapacityDefinition>(`${base(orgId)}/capacity-definitions`, input);
export const updateCapacityDefinition = (orgId: number, defId: number, input: CapacityDefinitionPatch) =>
  putJson<CapacityDefinition>(`${base(orgId)}/capacity-definitions/${defId}`, input);
export const transitionCapacityDefinition = (
  orgId: number,
  defId: number,
  input: { status?: string; deploymentStatus?: string; changeReason?: string },
) => postJson<CapacityDefinition>(`${base(orgId)}/capacity-definitions/${defId}/transition`, input);
export const cloneCapacityDefinition = (orgId: number, defId: number) =>
  postJson<CapacityDefinition>(`${base(orgId)}/capacity-definitions/${defId}/clone`, {});
export const deleteCapacityDefinition = (orgId: number, defId: number) =>
  deleteJson(`${base(orgId)}/capacity-definitions/${defId}`);

// ── Authority levels ──
export const listAuthorityLevels = (orgId: number, defId: number) =>
  getJson<AuthorityLevel[]>(`${base(orgId)}/capacity-definitions/${defId}/authority-levels`);
export const createAuthorityLevel = (orgId: number, defId: number, input: AuthorityLevelInput) =>
  postJson<AuthorityLevel>(`${base(orgId)}/capacity-definitions/${defId}/authority-levels`, input);
export const updateAuthorityLevel = (orgId: number, rowId: number, input: AuthorityLevelInput) =>
  putJson<AuthorityLevel>(`${base(orgId)}/authority-levels/${rowId}`, input);
export const deleteAuthorityLevel = (orgId: number, rowId: number) =>
  deleteJson(`${base(orgId)}/authority-levels/${rowId}`);

// ── Referral rules ──
export const listReferralRules = (orgId: number, defId: number) =>
  getJson<ReferralRule[]>(`${base(orgId)}/capacity-definitions/${defId}/referral-rules`);
export const createReferralRule = (orgId: number, defId: number, input: ReferralRuleInput) =>
  postJson<ReferralRule>(`${base(orgId)}/capacity-definitions/${defId}/referral-rules`, input);
export const updateReferralRule = (orgId: number, rowId: number, input: ReferralRuleInput) =>
  putJson<ReferralRule>(`${base(orgId)}/referral-rules/${rowId}`, input);
export const deleteReferralRule = (orgId: number, rowId: number) =>
  deleteJson(`${base(orgId)}/referral-rules/${rowId}`);

// ── Rule sets ──
export const listRuleSets = (orgId: number, defId: number) =>
  getJson<RuleSet[]>(`${base(orgId)}/capacity-definitions/${defId}/rule-sets`);
export const createRuleSet = (orgId: number, defId: number, input: RuleSetInput) =>
  postJson<RuleSet>(`${base(orgId)}/capacity-definitions/${defId}/rule-sets`, input);
export const updateRuleSet = (orgId: number, rowId: number, input: RuleSetInput) =>
  putJson<RuleSet>(`${base(orgId)}/rule-sets/${rowId}`, input);
export const deleteRuleSet = (orgId: number, rowId: number) =>
  deleteJson(`${base(orgId)}/rule-sets/${rowId}`);
export const runRuleSet = (orgId: number, rowId: number, subjectId: number, dryRun: boolean) =>
  postJson<RuleRunResult>(`${base(orgId)}/rule-sets/${rowId}/run`, { subjectId, dryRun });

// ── Simulations ──
export const listSimulations = (orgId: number) => getJson<Simulation[]>(`${base(orgId)}/simulations`);
export const runSimulation = (orgId: number, input: SimulationInput) =>
  postJson<Simulation>(`${base(orgId)}/simulations`, input);
export const deleteSimulation = (orgId: number, simId: number) =>
  deleteJson(`${base(orgId)}/simulations/${simId}`);

// ── Audit ──
export const listAudit = (orgId: number, definitionId?: number) =>
  getJson<AuditEntry[]>(`${base(orgId)}/audit${definitionId ? `?definitionId=${definitionId}` : ''}`);

// ── Appetite validation rules (flat, enforced by the validation pipeline) ──
export interface AppetiteValidationRule {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  name: string;
  description: string | null;
  field: string;
  operator: string;
  value: unknown;
  severity: string;
  enabled: boolean;
  sortOrder: number;
}
export type AppetiteValidationRuleInput = Partial<Omit<AppetiteValidationRule, 'id' | 'capacityDefinitionId' | 'organizationId'>>;

export const listValidationRules = (orgId: number, defId: number) =>
  getJson<AppetiteValidationRule[]>(`${base(orgId)}/capacity-definitions/${defId}/validation-rules`);
export const createValidationRule = (orgId: number, defId: number, input: AppetiteValidationRuleInput) =>
  postJson<AppetiteValidationRule>(`${base(orgId)}/capacity-definitions/${defId}/validation-rules`, input);
export const updateValidationRule = (orgId: number, rowId: number, input: AppetiteValidationRuleInput) =>
  putJson<AppetiteValidationRule>(`${base(orgId)}/validation-rules/${rowId}`, input);
export const deleteValidationRule = (orgId: number, rowId: number) =>
  deleteJson(`${base(orgId)}/validation-rules/${rowId}`);

// ── Per-location limits (LOB × location) + capacity utilization layer ──
export interface LocationLimit {
  id: number;
  capacityDefinitionId: number;
  organizationId: number;
  lineOfBusinessCode: string;
  entry: string;
  level: 'country' | 'state' | 'city';
  maxLineSize: string | null;
  aggregateLimit: string | null;
  perOccurrenceLimit: string | null;
  appetiteStance: string | null;
  minimumPremium: string | null;
  minRateOnLine: string | null;
  referralThreshold: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  currency: string;
  enabled: boolean;
}
export interface LocationLimitInput {
  entry: string;
  lineOfBusinessCode?: string;
  maxLineSize?: number | string | null;
  aggregateLimit?: number | string | null;
  perOccurrenceLimit?: number | string | null;
  appetiteStance?: string | null;
  minimumPremium?: number | string | null;
  minRateOnLine?: number | string | null;
  referralThreshold?: number | string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  currency?: string;
}
export interface LocationUtilization {
  entry: string;
  level: 'country' | 'state' | 'city';
  lineOfBusinessCode: string;
  currency: string;
  aggregateLimit: number | null;
  maxLineSize: number | null;
  boundExposure: number;
  inFlightExposure: number;
  deployed: number;
  utilizationPct: number | null;
}
export interface CapacityLayer {
  regions: LocationUtilization[];
  warnings: string[];
}

export const getLocationLimits = (orgId: number, defId: number) =>
  getJson<LocationLimit[]>(`${base(orgId)}/capacity-definitions/${defId}/location-limits`);
export const upsertLocationLimit = (orgId: number, defId: number, input: LocationLimitInput) =>
  putJson<LocationLimit | { deleted: true }>(`${base(orgId)}/capacity-definitions/${defId}/location-limits`, input);
export const deleteLocationLimit = (orgId: number, limitId: number) =>
  deleteJson(`${base(orgId)}/location-limits/${limitId}`);
export const getCapacityLayer = (orgId: number, lob?: string) =>
  getJson<CapacityLayer>(`${base(orgId)}/capacity-layer${lob && lob !== '*' ? `?lob=${encodeURIComponent(lob)}` : ''}`);
