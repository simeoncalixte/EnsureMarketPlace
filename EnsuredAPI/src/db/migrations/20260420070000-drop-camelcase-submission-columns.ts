import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

const pairs = [
  { camel: 'insurerProfileId', snake: 'insurer_profile_id' },
  { camel: 'portfolioId', snake: 'portfolio_id' },
  { camel: 'submittedByUserId', snake: 'submitted_by_user_id' },
  { camel: 'createdAt', snake: 'created_at' },
  { camel: 'updatedAt', snake: 'updated_at' },
  { camel: 'receivedAt', snake: 'received_at' },
];

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable('submissions', { transaction });

    for (const p of pairs) {
      const hasCamel = Object.prototype.hasOwnProperty.call(desc, p.camel);
      const hasSnake = Object.prototype.hasOwnProperty.call(desc, p.snake);

      if (!hasCamel) continue;

      if (hasSnake) {
        // copy any data from camel -> snake when snake is null
        await context.sequelize.query(
          `UPDATE "submissions" SET "${p.snake}" = "${p.camel}" WHERE "${p.snake}" IS NULL`,
          { transaction },
        );
      } else {
        // rename camel -> snake if snake missing
        await context.renameColumn('submissions', p.camel, p.snake, { transaction });
        // refresh desc for subsequent iterations
        continue;
      }

      // drop FK/unique constraints that reference the camel column
      const constraintsSql = `
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE kcu.table_name = 'submissions' AND kcu.column_name = '${p.camel}' AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE')
      `;
      const rows: Array<{ constraint_name: string }> = await context.sequelize.query(constraintsSql, { type: QueryTypes.SELECT, transaction });
      for (const r of rows) {
        try {
          await context.sequelize.query(`ALTER TABLE "submissions" DROP CONSTRAINT "${r.constraint_name}"`, { transaction });
        } catch (_) {}
      }

      // drop any index that references the camel column
      try {
        await context.removeIndex('submissions', [p.camel], { transaction });
      } catch (_) {}

      // finally drop the camel column
      try {
        await context.removeColumn('submissions', p.camel, { transaction });
      } catch (_) {}
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

    for (const p of pairs) {
      const hasCamel = Object.prototype.hasOwnProperty.call(desc, p.camel);
      const hasSnake = Object.prototype.hasOwnProperty.call(desc, p.snake);

      if (hasCamel) continue;

      if (hasSnake) {
        // recreate camel column and copy data back
        await context.addColumn('submissions', p.camel, { type: DataTypes.INTEGER, allowNull: true }, { transaction }).catch(() => {});
        await context.sequelize.query(
          `UPDATE "submissions" SET "${p.camel}" = "${p.snake}" WHERE "${p.camel}" IS NULL`,
          { transaction },
        );
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
