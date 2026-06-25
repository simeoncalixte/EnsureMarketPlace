import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class PerilCategory extends Model<InferAttributes<PerilCategory>, InferCreationAttributes<PerilCategory>> {
  declare code: string;
  declare label: string;
  declare description: CreationOptional<string | null>;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Peril extends Model<InferAttributes<Peril>, InferCreationAttributes<Peril>> {
  declare code: string;
  declare categoryCode: string;
  declare label: string;
  declare description: CreationOptional<string | null>;
  declare isCatastrophe: boolean;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPerilModels(sequelize: Sequelize): void {
  PerilCategory.init(
    {
      code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      label: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'PerilCategory', tableName: 'perilCategories' },
  );

  Peril.init(
    {
      code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      categoryCode: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'perilCategories', key: 'code' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      isCatastrophe: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Peril', tableName: 'perils' },
  );
}
