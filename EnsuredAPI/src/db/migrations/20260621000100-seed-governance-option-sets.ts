import { QueryInterface, Transaction } from 'sequelize';

/**
 * Seeds the Governance module's selectable lists as global (organization-scoped
 * null) option sets in `schema_option_sets`, so NOTHING in the Governance UI is
 * a hardcoded array — every status, severity, operator, accumulation method,
 * distribution tier, simulation type and organizational-structure list is loaded
 * from this seed and editable per-org later. Idempotent: a key already present
 * (as a global set) is skipped, so re-running never duplicates.
 */

type OptionItem = { value: string; label: string };
type OptionSet = { key: string; label: string; items: OptionItem[] };

const list = (...labels: string[]): OptionItem[] =>
  labels.map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), label }));

const GOVERNANCE_OPTION_SETS: OptionSet[] = [
  // Section 1 — capacity status
  { key: 'governance.capacity.status', label: 'Capacity Status', items: list('Draft', 'Pending Approval', 'Active', 'Suspended', 'Retired') },
  // Section 19 — deployment lifecycle status
  { key: 'governance.deployment.status', label: 'Deployment Status', items: list('Draft', 'Testing', 'Approval Pending', 'Approved', 'Scheduled', 'Active', 'Retired') },
  // Section 14 — referral severity
  { key: 'governance.referral.severity', label: 'Referral Severity', items: list('Low', 'Medium', 'High', 'Critical') },
  // Section 5 — limit enforcement kinds
  { key: 'governance.exposure.limitKind', label: 'Limit Enforcement', items: list('Hard Limit', 'Soft Limit', 'Referral Threshold') },
  // Section 7 — accumulation basis / methods
  { key: 'governance.accumulation.method', label: 'Accumulation Method', items: list('Geographic', 'Organizational', 'Industry', 'Distribution Channel', 'Customer', 'Risk Category', 'Custom') },
  // Section 15 — rules-engine operators
  {
    key: 'governance.rules.operator',
    label: 'Rule Operators',
    items: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Does Not Equal' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'greater_or_equal', label: 'Greater Than Or Equal' },
      { value: 'less_or_equal', label: 'Less Than Or Equal' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'exists', label: 'Exists' },
      { value: 'not_exists', label: 'Does Not Exist' },
      { value: 'in_list', label: 'In List' },
      { value: 'not_in_list', label: 'Not In List' },
      { value: 'within_radius', label: 'Within Radius' },
      { value: 'outside_radius', label: 'Outside Radius' },
    ],
  },
  // Section 15 — boolean connectors
  { key: 'governance.rules.connector', label: 'Rule Connectors', items: [ { value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }, { value: 'NOT', label: 'NOT' } ] },
  // Section 12 — score models
  { key: 'governance.scoring.model', label: 'Score Models', items: list('Internal Heuristic', 'Weighted Composite', 'External Model', 'Hybrid') },
  // Section 10 — distribution tiers
  { key: 'governance.distribution.tier', label: 'Distribution Tiers', items: list('Tier 1', 'Tier 2', 'Tier 3', 'Unrated') },
  // Section 18 — simulation types
  { key: 'governance.simulation.type', label: 'Simulation Types', items: list('Rule Testing', 'Capacity Simulation', 'Historical Replay', 'What-If Analysis', 'Impact Forecasting', 'Referral Forecasting', 'Portfolio Impact Analysis') },
  // Section 2 — organizational structure (starter values; per-org editable)
  // Line of business — starter values only; migration 20260630000000 re-points
  // this set at the full LOB taxonomy.
  { key: 'governance.org.lineOfBusiness', label: 'Line of Business', items: list('Property', 'General Liability', 'Specialty') },
  { key: 'governance.org.department', label: 'Departments', items: list('Underwriting', 'Portfolio Management', 'Risk Management', 'Operations', 'Actuarial') },
  { key: 'governance.org.team', label: 'Teams', items: list('Property', 'Casualty', 'Marine', 'Cyber', 'Aviation') },
  // Cross-cutting — currencies
  { key: 'governance.currency', label: 'Currencies', items: [ { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }, { value: 'JPY', label: 'JPY' }, { value: 'CHF', label: 'CHF' } ] },
];

async function globalSetExists(context: QueryInterface, key: string, transaction: Transaction): Promise<boolean> {
  const [rows] = (await context.sequelize.query(
    `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL LIMIT 1`,
    { replacements: { key }, transaction },
  )) as [Array<{ id: number }>, unknown];
  return Array.isArray(rows) && rows.length > 0;
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const now = new Date();
  try {
    for (const set of GOVERNANCE_OPTION_SETS) {
      if (await globalSetExists(context, set.key, transaction)) continue;

      await context.bulkInsert(
        'schema_option_sets',
        [{ organization_id: null, option_set_key: set.key, label: set.label, line_of_business_code: '', line_of_business_sub_type_code: '', source: 'seed', created_at: now, updated_at: now }],
        { transaction },
      );

      const [headerRows] = (await context.sequelize.query(
        `SELECT id FROM "schema_option_sets" WHERE "option_set_key" = :key AND "organization_id" IS NULL ORDER BY id DESC LIMIT 1`,
        { replacements: { key: set.key }, transaction },
      )) as [Array<{ id: number }>, unknown];
      const headerId = headerRows?.[0]?.id;
      if (!headerId) continue;

      await context.bulkInsert(
        'schema_option_set_items',
        set.items.map((item, index) => ({
          option_set_id: headerId,
          value: item.value,
          label: item.label,
          order: index + 1,
          created_at: now,
          updated_at: now,
        })),
        { transaction },
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const keys = GOVERNANCE_OPTION_SETS.map((s) => s.key);
    const [headerRows] = (await context.sequelize.query(
      `SELECT id FROM "schema_option_sets" WHERE "organization_id" IS NULL AND "option_set_key" IN (:keys)`,
      { replacements: { keys }, transaction },
    )) as [Array<{ id: number }>, unknown];
    const ids = (headerRows ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await context.bulkDelete('schema_option_set_items', { option_set_id: ids }, { transaction });
      await context.bulkDelete('schema_option_sets', { id: ids }, { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
