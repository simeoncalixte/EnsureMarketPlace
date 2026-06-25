import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Close-the-loop Issue 1 — the pre-bind compliance gate.
 *
 * Strictly ADDITIVE: three new tables, no existing table touched.
 *   - `compliance_clearances` — append-only per-submission clearance rollup (the
 *     bind/quote gate reads the latest row).
 *   - `sanctions_screens` — immutable per-party screening log.
 *   - `jurisdiction_license_authorities` — admitted-status authority table the
 *     carrier-licensing check reads; seeded with platform-default rows so the
 *     deterministic check has data out of the box.
 *
 * Column naming is camelCase (model `underscored:false`), mirroring
 * `benchmark_priors`. Idempotent guards mirror the existing migrations.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'compliance_clearances', transaction))) {
      await context.createTable(
        'compliance_clearances',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          submissionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'submissions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          tenantId: { type: DataTypes.INTEGER, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
          sanctionsStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'skipped' },
          licensingStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'skipped' },
          checksJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          evidenceJson: { type: DataTypes.JSONB, allowNull: true },
          provider: { type: DataTypes.STRING, allowNull: true },
          sanctionsListVersion: { type: DataTypes.STRING, allowNull: true },
          reviewedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          reviewedAt: { type: DataTypes.DATE, allowNull: true },
          screenedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('compliance_clearances', ['submissionId'], {
        transaction,
        name: 'compliance_clearances_submission_idx',
      });
    }

    if (!(await tableExists(context, 'sanctions_screens', transaction))) {
      await context.createTable(
        'sanctions_screens',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          submissionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'submissions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          clearanceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'compliance_clearances', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          tenantId: { type: DataTypes.INTEGER, allowNull: true },
          partyName: { type: DataTypes.STRING, allowNull: false },
          partyRole: { type: DataTypes.STRING, allowNull: false },
          provider: { type: DataTypes.STRING, allowNull: false },
          listVersion: { type: DataTypes.STRING, allowNull: true },
          result: { type: DataTypes.STRING, allowNull: false },
          matchesJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
          screenedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('sanctions_screens', ['submissionId'], {
        transaction,
        name: 'sanctions_screens_submission_idx',
      });
      await context.addIndex('sanctions_screens', ['clearanceId'], {
        transaction,
        name: 'sanctions_screens_clearance_idx',
      });
    }

    if (!(await tableExists(context, 'jurisdiction_license_authorities', transaction))) {
      await context.createTable(
        'jurisdiction_license_authorities',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          countryCode: { type: DataTypes.STRING, allowNull: false },
          stateCode: { type: DataTypes.STRING, allowNull: true },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: true },
          carrierOrganizationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          admitted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          surplusLinesEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          licenseNumber: { type: DataTypes.STRING, allowNull: true },
          notes: { type: DataTypes.TEXT, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex(
        'jurisdiction_license_authorities',
        ['countryCode', 'stateCode', 'lineOfBusinessCode'],
        { transaction, name: 'jurisdiction_license_authorities_scope_idx' },
      );

      // Platform-default admitted authorities. Org-null + LOB-null rows apply to
      // every carrier and line in the jurisdiction. These let the deterministic
      // licensing check resolve admitted status without per-carrier filings; a
      // real deployment loads filed authority data on top of these.
      const now = new Date();
      const base = { carrierOrganizationId: null, status: 'active', createdAt: now, updatedAt: now };
      const admittedCountries = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG', 'BR', 'ZA'];
      const rows: Record<string, unknown>[] = admittedCountries.map((countryCode) => ({
        ...base,
        countryCode,
        stateCode: null,
        lineOfBusinessCode: null,
        admitted: true,
        surplusLinesEligible: true,
        licenseNumber: null,
        notes: `Platform-default admitted authority for ${countryCode} (demo seed).`,
      }));
      // A state-specific surplus-lines-only example (more specific than the US
      // default) to exercise the non-admitted → surplus-lines path.
      rows.push({
        ...base,
        countryCode: 'US',
        stateCode: 'FL',
        lineOfBusinessCode: null,
        admitted: false,
        surplusLinesEligible: true,
        licenseNumber: 'SL-FL-DEMO',
        notes: 'Florida surplus-lines path (demo seed).',
      });

      await context.bulkInsert('jurisdiction_license_authorities', rows, { transaction });
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
    // Drop in FK-dependency order (screens reference clearances).
    if (await tableExists(context, 'sanctions_screens', transaction)) {
      await context.dropTable('sanctions_screens', { transaction });
    }
    if (await tableExists(context, 'compliance_clearances', transaction)) {
      await context.dropTable('compliance_clearances', { transaction });
    }
    if (await tableExists(context, 'jurisdiction_license_authorities', transaction)) {
      await context.dropTable('jurisdiction_license_authorities', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
