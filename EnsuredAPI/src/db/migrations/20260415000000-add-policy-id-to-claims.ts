import { DataTypes, QueryInterface } from 'sequelize';

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const description = await context.describeTable('claims');
  if (!description['policyId']) {
    await context.addColumn('claims', 'policyId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'policies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const description = await context.describeTable('claims');
  if (description['policyId']) {
    await context.removeColumn('claims', 'policyId');
  }
}
