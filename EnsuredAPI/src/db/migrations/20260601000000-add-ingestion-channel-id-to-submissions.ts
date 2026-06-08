import { DataTypes, QueryInterface } from 'sequelize';

async function columnExists(description: Record<string, unknown>, col: string): Promise<boolean> {
  return Object.keys(description).some((c) => c === col || c.toLowerCase() === col.toLowerCase());
}

/**
 * Links a submission to the ingestion channel it was produced from.
 * Nullable, no FK constraint (submissions intentionally carry no FK constraints
 * in this schema — see 20260421000000-drop-submissions-fk-constraints).
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable('submissions', { transaction });

    if (!(await columnExists(desc, 'ingestion_channel_id'))) {
      await context.addColumn(
        'submissions',
        'ingestion_channel_id',
        { type: DataTypes.INTEGER, allowNull: true },
        { transaction },
      );
      await context.addIndex('submissions', ['ingestion_channel_id'], { transaction });
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

    if (await columnExists(desc, 'ingestion_channel_id')) {
      await context.removeColumn('submissions', 'ingestion_channel_id', { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
