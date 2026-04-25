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

    if (!(await columnExists(desc, 'source'))) {
      await context.addColumn('submissions', 'source', { type: DataTypes.TEXT, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['source']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "source" = "${src}" WHERE "source" IS NULL`,
          { transaction },
        );
      }
    }

    if (!(await columnExists(desc, 'transport'))) {
      await context.addColumn('submissions', 'transport', { type: DataTypes.TEXT, allowNull: true }, { transaction });
      const src = await findExistingColumn(desc, ['transport']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "transport" = "${src}" WHERE "transport" IS NULL`,
          { transaction },
        );
      }
    }

    if (!(await columnExists(desc, 'received_at'))) {
      await context.addColumn(
        'submissions',
        'received_at',
        { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
        { transaction },
      );
      const src = await findExistingColumn(desc, ['receivedAt', 'receivedat']);
      if (src) {
        await context.sequelize.query(
          `UPDATE "submissions" SET "received_at" = "${src}" WHERE "received_at" IS NULL`,
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

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable('submissions', { transaction });

    if (await columnExists(desc, 'source')) {
      await context.removeColumn('submissions', 'source', { transaction });
    }
    if (await columnExists(desc, 'transport')) {
      await context.removeColumn('submissions', 'transport', { transaction });
    }
    if (await columnExists(desc, 'received_at')) {
      await context.removeColumn('submissions', 'received_at', { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
