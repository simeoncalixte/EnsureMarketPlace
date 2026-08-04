import { getSequelize } from '../../src/db/config/database';

/**
 * Drops and recreates all tables in the test database by syncing all
 * registered Sequelize models with `force: true`.
 * Call this in `beforeAll` at the top of each service test file.
 */
export async function initTestDb(): Promise<void> {
  const sequelize = getSequelize();
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
}

/**
 * Truncates the given tables and resets their auto-increment sequences.
 * CASCADE ensures FK-dependent rows are also removed.
 * Call this in `beforeEach` to keep tests isolated within a file.
 */
export async function truncateTables(...tableNames: string[]): Promise<void> {
  const sequelize = getSequelize();
  for (const table of tableNames) {
    await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
}
