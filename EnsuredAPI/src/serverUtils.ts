import type { FastifyInstance } from 'fastify';
import type { Sequelize } from 'sequelize';
import { createMigrator } from './db/migrator';
import { ensureDefaultPageTemplates } from './db/pageTemplateDefaults';
import { syncPipelineOperationCatalog } from './services/pipeline/operations/catalog';
import { closeSequelize } from './db/config/database';

export async function authenticateAndMigrate(sequelize: Sequelize): Promise<void> {
  await sequelize.authenticate();
  await createMigrator(sequelize).up();
  await ensureDefaultPageTemplates(sequelize);
}

export async function syncPipelineOperationCatalogs(): Promise<void> {
  try {
    const opSync = await syncPipelineOperationCatalog();
    if (opSync.added.length > 0) {
      console.info(`Registered ${opSync.added.length} new pipeline operation(s): ${opSync.added.join(', ')}`);
    }
    if (opSync.pruned.length > 0) {
      console.info(`Pruned ${opSync.pruned.length} stale pipeline operation(s): ${opSync.pruned.join(', ')}`);
    }
  } catch (err) {
    console.warn('Pipeline operation catalog sync failed:', err);
  }
}

export function setupShutdownHandlers(app: FastifyInstance): void {
  const shutdown = async (): Promise<void> => {
    await app.close();
    await closeSequelize();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
