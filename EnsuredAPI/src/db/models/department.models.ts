import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Organizational structure — Departments and the Teams nested within them.
 *
 * An Organization owns a flat list of Departments; each Department owns a flat
 * list of Teams. Users are assigned to at most one Department and one Team (via
 * the nullable `departmentId` / `teamId` columns on `users`), mirroring the
 * single-FK convention the identity domain already uses for `organizationId`.
 *
 * A Team carries its owning `organizationId` directly (denormalised from its
 * Department) so the common "everything for this org" queries and the
 * multi-tenancy `where: { organizationId }` scope work without a join.
 */

export class Department extends Model<
  InferAttributes<Department>,
  InferCreationAttributes<Department>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare name: string;
  declare code: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Team extends Model<InferAttributes<Team>, InferCreationAttributes<Team>> {
  declare id: CreationOptional<number>;
  declare departmentId: number;
  declare organizationId: number;
  declare name: string;
  declare code: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initDepartmentModels(sequelize: Sequelize): void {
  Department.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Department', tableName: 'departments', underscored: false },
  );

  Team.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Team', tableName: 'teams', underscored: false },
  );
}
