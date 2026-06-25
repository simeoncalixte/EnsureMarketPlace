import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Capacity Governance schema — the structured backing for the Governance module
 * (Capacity Configuration Form spec). Creates the `capacityDefinitions` spine
 * plus its child tables (authority levels, referral rules, rule sets,
 * simulations, audit entries) and seeds one starter definition per existing
 * organization so the registry renders on first load.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

function baseColumns() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

function orgFk() {
  return {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    onUpdate: 'CASCADE' as const,
    onDelete: 'CASCADE' as const,
  };
}

function defFk(allowNull = false) {
  return {
    type: DataTypes.INTEGER,
    allowNull,
    references: { model: 'capacityDefinitions', key: 'id' },
    onUpdate: 'CASCADE' as const,
    onDelete: 'CASCADE' as const,
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'capacityDefinitions', transaction))) {
      await context.createTable(
        'capacityDefinitions',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationId: orgFk(),

          name: { type: DataTypes.STRING, allowNull: false },
          code: { type: DataTypes.STRING, allowNull: true },
          description: { type: DataTypes.TEXT, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
          effectiveDate: { type: DataTypes.DATE, allowNull: true },
          expirationDate: { type: DataTypes.DATE, allowNull: true },
          versionNumber: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0.0' },

          deploymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

          lineOfBusiness: { type: DataTypes.STRING, allowNull: true },
          department: { type: DataTypes.STRING, allowNull: true },
          team: { type: DataTypes.STRING, allowNull: true },
          ownerUserId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          backupOwnerUserId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          riskManagerUserId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          approvalCommittee: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

          geographicControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          riskEligibility: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          exposureConstraints: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          portfolioControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          accumulationControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          pricingControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          coverageControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          distributionControls: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          riskScoring: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          workflowConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

          createdByUserId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
          lastModifiedByUserId: { type: DataTypes.INTEGER, allowNull: true },
          approvedByUserId: { type: DataTypes.INTEGER, allowNull: true },
          approvalDate: { type: DataTypes.DATE, allowNull: true },
          changeReason: { type: DataTypes.TEXT, allowNull: true },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityDefinitions', ['organizationId'], { name: 'idx_capacity_defs_org', transaction });
      await context.addIndex('capacityDefinitions', ['organizationId', 'code'], { unique: true, name: 'uq_capacity_defs_org_code', transaction });
      await context.addIndex('capacityDefinitions', ['organizationId', 'status'], { name: 'idx_capacity_defs_status', transaction });
    }

    if (!(await tableExists(context, 'capacityAuthorityLevels', transaction))) {
      await context.createTable(
        'capacityAuthorityLevels',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: defFk(),
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          maxPremiumAuthority: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          maxExposureAuthority: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          maxPricingDeviation: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
          maxDiscountAuthority: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
          maxCreditAuthority: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
          referralThreshold: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityAuthorityLevels', ['capacityDefinitionId'], { name: 'idx_capacity_authority_def', transaction });
      await context.addIndex('capacityAuthorityLevels', ['organizationId'], { name: 'idx_capacity_authority_org', transaction });
      await context.addIndex('capacityAuthorityLevels', ['capacityDefinitionId', 'sortOrder'], { name: 'idx_capacity_authority_order', transaction });
    }

    if (!(await tableExists(context, 'capacityReferralRules', transaction))) {
      await context.createTable(
        'capacityReferralRules',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: defFk(),
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'medium' },
          triggerConditions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          referralDestinationType: { type: DataTypes.STRING, allowNull: true },
          referralDestinationId: { type: DataTypes.STRING, allowNull: true },
          activeFlag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityReferralRules', ['capacityDefinitionId'], { name: 'idx_capacity_referral_def', transaction });
      await context.addIndex('capacityReferralRules', ['organizationId'], { name: 'idx_capacity_referral_org', transaction });
      await context.addIndex('capacityReferralRules', ['capacityDefinitionId', 'sortOrder'], { name: 'idx_capacity_referral_order', transaction });
    }

    if (!(await tableExists(context, 'capacityRuleSets', transaction))) {
      await context.createTable(
        'capacityRuleSets',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: defFk(),
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          rootCondition: { type: DataTypes.JSONB, allowNull: false, defaultValue: { connector: 'AND', conditions: [] } },
          outcome: { type: DataTypes.STRING, allowNull: true },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityRuleSets', ['capacityDefinitionId'], { name: 'idx_capacity_ruleset_def', transaction });
      await context.addIndex('capacityRuleSets', ['organizationId'], { name: 'idx_capacity_ruleset_org', transaction });
      await context.addIndex('capacityRuleSets', ['capacityDefinitionId', 'sortOrder'], { name: 'idx_capacity_ruleset_order', transaction });
    }

    if (!(await tableExists(context, 'capacitySimulations', transaction))) {
      await context.createTable(
        'capacitySimulations',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: defFk(true),
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          simulationType: { type: DataTypes.STRING, allowNull: false },
          inputParams: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          results: { type: DataTypes.JSONB, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
          ranByUserId: { type: DataTypes.INTEGER, allowNull: true },
          ranAt: { type: DataTypes.DATE, allowNull: true },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacitySimulations', ['organizationId'], { name: 'idx_capacity_sim_org', transaction });
      await context.addIndex('capacitySimulations', ['capacityDefinitionId'], { name: 'idx_capacity_sim_def', transaction });
    }

    if (!(await tableExists(context, 'capacityAuditEntries', transaction))) {
      await context.createTable(
        'capacityAuditEntries',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: defFk(),
          organizationId: orgFk(),
          action: { type: DataTypes.STRING, allowNull: false },
          versionNumber: { type: DataTypes.STRING, allowNull: true },
          changeReason: { type: DataTypes.TEXT, allowNull: true },
          snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          changedByUserId: { type: DataTypes.INTEGER, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );
      await context.addIndex('capacityAuditEntries', ['capacityDefinitionId'], { name: 'idx_capacity_audit_def', transaction });
      await context.addIndex('capacityAuditEntries', ['organizationId'], { name: 'idx_capacity_audit_org', transaction });
    }

    // Seed one starter capacity definition per organization that has none, so the
    // Governance registry renders with a real row on first load.
    const now = new Date();
    const [orgRows] = (await context.sequelize.query(
      `SELECT o.id
         FROM "organizations" o
         LEFT JOIN "capacityDefinitions" c
           ON c."organizationId" = o.id
        WHERE c.id IS NULL`,
      { transaction },
    )) as [Array<{ id: number }>, unknown];

    if (Array.isArray(orgRows) && orgRows.length > 0) {
      await context.bulkInsert(
        'capacityDefinitions',
        orgRows.map((org) => ({
          organizationId: org.id,
          name: 'Primary Capacity',
          code: 'PRIMARY',
          description: 'Starter capacity definition. Configure appetite, controls, authority and workflow to match your operation.',
          status: 'draft',
          versionNumber: '1.0.0',
          deploymentStatus: 'draft',
          isActive: false,
          approvalCommittee: JSON.stringify([]),
          geographicControls: JSON.stringify({}),
          riskEligibility: JSON.stringify({}),
          exposureConstraints: JSON.stringify({}),
          portfolioControls: JSON.stringify({}),
          accumulationControls: JSON.stringify({}),
          pricingControls: JSON.stringify({}),
          coverageControls: JSON.stringify({}),
          distributionControls: JSON.stringify({}),
          riskScoring: JSON.stringify({}),
          workflowConfig: JSON.stringify({}),
          createdAt: now,
          updatedAt: now,
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
    for (const table of [
      'capacityAuditEntries',
      'capacitySimulations',
      'capacityRuleSets',
      'capacityReferralRules',
      'capacityAuthorityLevels',
      'capacityDefinitions',
    ]) {
      if (await tableExists(context, table, transaction)) {
        await context.dropTable(table, { transaction });
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
