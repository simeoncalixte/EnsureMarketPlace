import { getSequelize, closeSequelize } from './config/database';
import { createMigrator } from './migrator';

async function run(): Promise<void> {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    const migrator = createMigrator(sequelize);
    const executedMigrations = await migrator.up();

    const names = executedMigrations.map((migration) => migration.name).join(', ');
    console.log(names ? `Executed migrations: ${names}` : 'Database already up to date.');
  } finally {
    await closeSequelize();
  }
}

run().catch((error) => {
  console.error('Migration failed.', error);
  process.exitCode = 1;
});
