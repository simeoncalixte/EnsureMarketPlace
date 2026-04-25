import { DataTypes, QueryInterface } from 'sequelize';

async function columnExists(description: Record<string, any>, name: string) {
  return Object.keys(description).some((k) => k === name || k.toLowerCase() === name.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const desc = await context.describeTable('submissions', { transaction });

    // Change both snake_case and camelCase variants if present
    if (await columnExists(desc, 'insurer_profile_id')) {
      await context.changeColumn('submissions', 'insurer_profile_id', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
    }
    if (await columnExists(desc, 'insurerProfileId')) {
      await context.changeColumn('submissions', 'insurerProfileId', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
    }

    if (await columnExists(desc, 'portfolio_id')) {
      await context.changeColumn('submissions', 'portfolio_id', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
    }
    if (await columnExists(desc, 'portfolioId')) {
      await context.changeColumn('submissions', 'portfolioId', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
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
      await context.changeColumn('submissions', 'insurer_profile_id', { type: DataTypes.INTEGER, allowNull: false }, { transaction });
    }
    if (await columnExists(desc, 'insurerProfileId')) {
      await context.changeColumn('submissions', 'insurerProfileId', { type: DataTypes.INTEGER, allowNull: false }, { transaction });
    }

    if (await columnExists(desc, 'portfolio_id')) {
      await context.changeColumn('submissions', 'portfolio_id', { type: DataTypes.INTEGER, allowNull: false }, { transaction });
    }
    if (await columnExists(desc, 'portfolioId')) {
      await context.changeColumn('submissions', 'portfolioId', { type: DataTypes.INTEGER, allowNull: false }, { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
