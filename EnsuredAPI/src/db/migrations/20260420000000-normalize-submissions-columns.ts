import { DataTypes, QueryInterface } from 'sequelize';

async function columnExists(description: Record<string, unknown>, col: string): Promise<boolean> {
  return Object.keys(description).some((c) => c === col || c.toLowerCase() === col.toLowerCase());
}

async function findExistingColumn(description: Record<string, unknown>, candidates: string[]): Promise<string | null> {
  const keys = Object.keys(description);
  for (const cand of candidates) {
    const found = keys.find((k) => k === cand || k.toLowerCase() === cand.toLowerCase());
    if (found) return found;
  }
  return null;
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    const desc = await context.describeTable('submissions', { transaction });

    // Ensure snake_case columns exist and copy from camelCase if present.
    // insurer_profile_id <- insurerProfileId
    if (!(await columnExists(desc, 'insurer_profile_id'))) {
      await context.addColumn(
        'submissions',
        'insurer_profile_id',
        { type: DataTypes.INTEGER, allowNull: true },
        { transaction },
      );

      const src = await findExistingColumn(desc, ['insurerProfileId', 'insurerprofileid']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "insurer_profile_id" = "${src}" WHERE "insurer_profile_id" IS NULL`,
          { transaction },
        );
      }

      await context.addConstraint('submissions', {
        fields: ['insurer_profile_id'],
        type: 'foreign key',
        name: 'fk_submissions_insurer_profile_id',
        references: { table: 'insurerProfiles', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        transaction,
      });
    }

    // portfolio_id <- portfolioId
    if (!(await columnExists(desc, 'portfolio_id'))) {
      await context.addColumn('submissions', 'portfolio_id', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['portfolioId', 'portfolioid']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "portfolio_id" = "${src}" WHERE "portfolio_id" IS NULL`,
          { transaction },
        );
      }
      await context.addConstraint('submissions', {
        fields: ['portfolio_id'],
        type: 'foreign key',
        name: 'fk_submissions_portfolio_id',
        references: { table: 'riskPortfolios', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        transaction,
      });
    }

    // submitted_by_user_id <- submittedByUserId
    if (!(await columnExists(desc, 'submitted_by_user_id'))) {
      await context.addColumn(
        'submissions',
        'submitted_by_user_id',
        { type: DataTypes.INTEGER, allowNull: true },
        { transaction },
      );
      const src = await findExistingColumn(desc, ['submittedByUserId', 'submittedbyuserid']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "submitted_by_user_id" = "${src}" WHERE "submitted_by_user_id" IS NULL`,
          { transaction },
        );
      }
      await context.addConstraint('submissions', {
        fields: ['submitted_by_user_id'],
        type: 'foreign key',
        name: 'fk_submissions_submitted_by_user_id',
        references: { table: 'users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction,
      });
    }

    // created_at / updated_at <- createdAt / updatedAt
    if (!(await columnExists(desc, 'created_at'))) {
      await context.addColumn('submissions', 'created_at', { type: DataTypes.DATE, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['createdAt', 'createdat']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "created_at" = "${src}" WHERE "created_at" IS NULL`,
          { transaction },
        );
      }
    }

    if (!(await columnExists(desc, 'updated_at'))) {
      await context.addColumn('submissions', 'updated_at', { type: DataTypes.DATE, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['updatedAt', 'updatedat']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "updated_at" = "${src}" WHERE "updated_at" IS NULL`,
          { transaction },
        );
      }
    }

    // Ensure tenant_id exists (some migrations created tenant_id already)
    if (!(await columnExists(desc, 'tenant_id'))) {
      await context.addColumn('submissions', 'tenant_id', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['tenantId', 'tenantid']);
      if (src) {
        await context.sequelize.query(`UPDATE "submissions" SET "tenant_id" = "${src}" WHERE "tenant_id" IS NULL`, { transaction });
      }
      await context.addIndex('submissions', ['tenant_id'], { name: 'idx_submissions_tenant_id', transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable('submissions', { transaction });

    if (await columnExists(desc, 'insurer_profile_id')) {
      try {
        await context.removeConstraint('submissions', 'fk_submissions_insurer_profile_id', { transaction });
      } catch (_) {}
      await context.removeColumn('submissions', 'insurer_profile_id', { transaction });
    }

    if (await columnExists(desc, 'portfolio_id')) {
      try {
        await context.removeConstraint('submissions', 'fk_submissions_portfolio_id', { transaction });
      } catch (_) {}
      await context.removeColumn('submissions', 'portfolio_id', { transaction });
    }

    if (await columnExists(desc, 'submitted_by_user_id')) {
      try {
        await context.removeConstraint('submissions', 'fk_submissions_submitted_by_user_id', { transaction });
      } catch (_) {}
      await context.removeColumn('submissions', 'submitted_by_user_id', { transaction });
    }

    if (await columnExists(desc, 'created_at')) {
      await context.removeColumn('submissions', 'created_at', { transaction });
    }

    if (await columnExists(desc, 'updated_at')) {
      await context.removeColumn('submissions', 'updated_at', { transaction });
    }

    if (await columnExists(desc, 'tenant_id')) {
      await context.removeIndex('submissions', 'idx_submissions_tenant_id', { transaction }).catch(() => {});
      await context.removeColumn('submissions', 'tenant_id', { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
