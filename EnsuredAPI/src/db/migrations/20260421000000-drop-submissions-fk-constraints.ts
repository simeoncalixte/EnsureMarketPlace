import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const constraintsSql = `
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.table_name = 'submissions' AND tc.constraint_type = 'FOREIGN KEY'
    `;

    const rows: Array<{ constraint_name: string; column_name: string }> = await context.sequelize.query(constraintsSql, {
      type: QueryTypes.SELECT,
      transaction,
    });

    for (const r of rows) {
      const name = (r as any).constraint_name;
      if (!name) continue;
      try {
        // Prefer QueryInterface helper
        // @ts-ignore - some runtimes accept removeConstraint
        await context.removeConstraint('submissions', name, { transaction });
      } catch (_) {
        try {
          // Fallback to raw SQL
          await context.sequelize.query(`ALTER TABLE "submissions" DROP CONSTRAINT "${name}"`, { transaction });
        } catch (_) {}
      }
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

    if (Object.prototype.hasOwnProperty.call(desc, 'insurer_profile_id')) {
      try {
        await context.addConstraint('submissions', {
          fields: ['insurer_profile_id'],
          type: 'foreign key',
          name: 'fk_submissions_insurer_profile_id',
          references: { table: 'insurerProfiles', field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          transaction,
        } as any);
      } catch (_) {}
    }

    if (Object.prototype.hasOwnProperty.call(desc, 'portfolio_id')) {
      try {
        await context.addConstraint('submissions', {
          fields: ['portfolio_id'],
          type: 'foreign key',
          name: 'fk_submissions_portfolio_id',
          references: { table: 'riskPortfolios', field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          transaction,
        } as any);
      } catch (_) {}
    }

    if (Object.prototype.hasOwnProperty.call(desc, 'submitted_by_user_id')) {
      try {
        await context.addConstraint('submissions', {
          fields: ['submitted_by_user_id'],
          type: 'foreign key',
          name: 'fk_submissions_submitted_by_user_id',
          references: { table: 'users', field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        } as any);
      } catch (_) {}
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
