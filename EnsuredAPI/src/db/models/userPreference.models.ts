import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Per-user UI preferences — a lean key/value store so a user's choices (e.g. the
 * map submission-type colors) follow them across devices. Keyed uniquely by
 * (userId, key); `value` is an opaque JSON blob owned by the feature that writes
 * it. Org-agnostic on purpose: these are personal, not tenant, settings.
 */
export class UserPreference extends Model<
  InferAttributes<UserPreference>,
  InferCreationAttributes<UserPreference>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare key: string;
  declare value: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserPreferenceModels(sequelize: Sequelize): void {
  UserPreference.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      key: { type: DataTypes.STRING, allowNull: false },
      value: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'UserPreference',
      tableName: 'user_preferences',
      underscored: true,
      indexes: [{ unique: true, name: 'uq_user_preferences_user_key', fields: ['user_id', 'key'] }],
    },
  );
}
