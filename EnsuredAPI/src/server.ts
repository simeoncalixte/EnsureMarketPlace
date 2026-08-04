import { buildApp } from './app';
import { env } from './db/config/env';
import { getSequelize } from './db/config/database';
import { authenticateAndMigrate, syncPipelineOperationCatalogs, setupShutdownHandlers } from './serverUtils';
import { getPipelineOrchestrator } from './services/pipeline/orchestrator/service';

async function start(): Promise<void> {
  const app = buildApp();
  const sequelize = getSequelize();
  const orchestrator = getPipelineOrchestrator();

  // Fastify seals its lifecycle after `listen()`. Register shutdown behavior
  // while the instance is still mutable, then start the worker only once the
  // HTTP server is ready to accept work.
  app.addHook('onClose', async () => orchestrator.stop());

  try {
    await authenticateAndMigrate(sequelize);
    await syncPipelineOperationCatalogs();

    await app.listen({
      host: '0.0.0.0',
      port: env.port,
    });
    // Resume jobs left queued by an earlier process and keep polling for retry
    // eligibility. New intake also wakes this worker immediately.
    orchestrator.start();
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }

  setupShutdownHandlers(app);
}

void start();
