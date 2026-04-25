import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class LineOfBusinessPrimaryType extends Model<InferAttributes<LineOfBusinessPrimaryType>, InferCreationAttributes<LineOfBusinessPrimaryType>> {
  declare code: string;
  declare label: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class LineOfBusinessSubType extends Model<InferAttributes<LineOfBusinessSubType>, InferCreationAttributes<LineOfBusinessSubType>> {
  declare code: string;
  declare primaryCode: string;
  declare label: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initLineOfBusinessModels(sequelize: Sequelize): void {
  LineOfBusinessPrimaryType.init(
    {
      code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      label: { type: DataTypes.STRING, allowNull: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'LineOfBusinessPrimaryType', tableName: 'lineOfBusinessPrimaryTypes' },
  );

  LineOfBusinessSubType.init(
    {
      code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      primaryCode: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'lineOfBusinessPrimaryTypes', key: 'code' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: { type: DataTypes.STRING, allowNull: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'LineOfBusinessSubType', tableName: 'lineOfBusinessSubTypes' },
  );
}
