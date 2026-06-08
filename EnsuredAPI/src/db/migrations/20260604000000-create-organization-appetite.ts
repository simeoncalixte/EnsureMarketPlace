import { DataTypes, QueryInterface, Transaction } from 'sequelize';

// Default appetite seeded for every existing organization so the configuration
// page is populated on first load. Mirrors the current ENV fallback values from
// pipeline/capacity/service.ts and pipeline/preRating/service.ts.
const DEFAULT_PREFERRED_PERILS = ['wind', 'hurricane', 'storm', 'flood'];
const DEFAULT_CAPACITY_BY_PERIL: Record<string, number> = {
  wind: 125_000_000,
  hurricane: 100_000_000,
  storm: 85_000_000,
  flood: 75_000_000,
  cyber: 25_000_000,
};
const DEFAULT_REQUIRED_FIELDS = ['riskType', 'limit', 'effectiveDate'];

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

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'organizationAppetiteProfiles', transaction))) {
      await context.createTable(
        'organizationAppetiteProfiles',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Default Appetite' },
          description: { type: DataTypes.TEXT, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
          isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

          currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
          totalDeployableCapital: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          minTargetYield: { type: DataTypes.DECIMAL(6, 4), allowNull: true },
          maxLineSize: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          minCoverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          maxCoverageLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          capacityByPeril: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

          preferredPerils: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          excludedPerils: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          allowedLinesOfBusiness: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

          preferredJurisdictions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          excludedJurisdictions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

          minDataQualityScore: { type: DataTypes.INTEGER, allowNull: true },
          requiredFields: { type: DataTypes.JSONB, allowNull: false, defaultValue: DEFAULT_REQUIRED_FIELDS },

          createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          ...baseColumns(),
        },
        { transaction },
      );

      await context.addIndex('organizationAppetiteProfiles', ['organizationId'], {
        name: 'idx_org_appetite_profiles_org',
        transaction,
      });
      await context.addIndex('organizationAppetiteProfiles', ['organizationId', 'name'], {
        unique: true,
        name: 'uq_org_appetite_profiles_org_name',
        transaction,
      });
      await context.addIndex('organizationAppetiteProfiles', ['organizationId', 'isDefault'], {
        name: 'idx_org_appetite_profiles_default',
        transaction,
      });
    }

    if (!(await tableExists(context, 'organizationValidationRules', transaction))) {
      await context.createTable(
        'organizationValidationRules',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          appetiteProfileId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizationAppetiteProfiles', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          field: { type: DataTypes.STRING, allowNull: false },
          operator: { type: DataTypes.STRING, allowNull: false },
          value: { type: DataTypes.JSONB, allowNull: true },
          severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'flag' },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );

      await context.addIndex('organizationValidationRules', ['organizationId'], {
        name: 'idx_org_validation_rules_org',
        transaction,
      });
      await context.addIndex('organizationValidationRules', ['appetiteProfileId'], {
        name: 'idx_org_validation_rules_profile',
        transaction,
      });
      await context.addIndex('organizationValidationRules', ['appetiteProfileId', 'sortOrder'], {
        name: 'idx_org_validation_rules_order',
        transaction,
      });
    }

    // Seed one default appetite profile per existing organization that does not
    // already have one, so the configuration page renders with sensible values.
    const now = new Date();
    const [orgRows] = (await context.sequelize.query(
      `SELECT o.id
         FROM "organizations" o
         LEFT JOIN "organizationAppetiteProfiles" p
           ON p."organizationId" = o.id
        WHERE p.id IS NULL`,
      { transaction },
    )) as [Array<{ id: number }>, unknown];

    if (Array.isArray(orgRows) && orgRows.length > 0) {
      await context.bulkInsert(
        'organizationAppetiteProfiles',
        orgRows.map((org) => ({
          organizationId: org.id,
          name: 'Default Appetite',
          description: 'Auto-generated default appetite. Adjust to match your underwriting strategy.',
          status: 'active',
          isDefault: true,
          currency: 'USD',
          capacityByPeril: JSON.stringify(DEFAULT_CAPACITY_BY_PERIL),
          preferredPerils: JSON.stringify(DEFAULT_PREFERRED_PERILS),
          excludedPerils: JSON.stringify([]),
          allowedLinesOfBusiness: JSON.stringify([]),
          preferredJurisdictions: JSON.stringify([]),
          excludedJurisdictions: JSON.stringify([]),
          minDataQualityScore: 60,
          requiredFields: JSON.stringify(DEFAULT_REQUIRED_FIELDS),
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
    if (await tableExists(context, 'organizationValidationRules', transaction)) {
      await context.dropTable('organizationValidationRules', { transaction });
    }
    if (await tableExists(context, 'organizationAppetiteProfiles', transaction)) {
      await context.dropTable('organizationAppetiteProfiles', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
