import { Sequelize } from 'sequelize';
import { env } from './env';
import { initModels } from '../db/models';

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const connectionUri = `postgres://${encodeURIComponent(env.dbUser)}:${encodeURIComponent(
      env.dbPassword
    )}@${env.dbHost}:${Number(env.dbPort)}/${encodeURIComponent(env.dbName)}`;

    // Construct Sequelize with a connection URI and explicit dialect string.
    // Most migrated tables use camelCase column names; snake_case tables opt in
    // per model instead of changing the global default.
    sequelize = new Sequelize(connectionUri, {
      dialect: 'postgres',
      logging: false,
      define: { underscored: false },
    });

    initModels(sequelize);
  }

  return sequelize;
}

export async function closeSequelize(): Promise<void> {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}
