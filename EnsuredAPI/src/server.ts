import { buildApp } from './app';
import { env } from './config/env';
import { closeSequelize, getSequelize } from './config/database';
import { createMigrator } from './db/migrator';
import { ensureDefaultPageTemplates } from './db/pageTemplateDefaults';
import { ReinsuranceSeedService } from './services/ReinsuranceSeedService';
import { ChannelSeedService } from './services/ChannelSeedService';
import { Deal, IngestionChannel } from './db/models';
import { seedBenchmarkPriors } from './pipeline/benchmarkPriors/seed';
import { seedCasualtyRegistryRows, seedCatRegistryRows } from './pipeline/registry/seed';
import { syncPipelineOperationCatalog } from './pipeline/operations/catalog';

async function start(): Promise<void> {
  const app = buildApp();
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    await createMigrator(sequelize).up();
    await ensureDefaultPageTemplates(sequelize);

    // Registry process — register any pipeline operation module missing from
    // pipelineOperationCatalogs. Reference data needed in ALL environments (orgs
    // configure pipelines against it). Idempotent + additive; failure is logged,
    // never blocks startup.
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

    // In development, if no deals exist, seed sample reinsurance data so
    // the marketplace endpoint returns real opportunities for the UI.
    if (process.env.NODE_ENV !== 'production') {
      try {
        const dealCount = await Deal.count();
        if (dealCount === 0) {
          const seedService = new ReinsuranceSeedService();
          // default options mirror the seed route used by tests
          // and are safe for local development.
          // eslint-disable-next-line no-console
          console.info('No deals found — seeding development data for marketplace');
          await seedService.seedAll({ investorCount: 4, tranchesPerDeal: 3 });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Dev seed failed:', err);
      }

      // Seed ingestion channels (per current configs) and the submissions each
      // channel produced, so the Pipeline Monitor can show channel→submission
      // lineage. Runs once, after the reinsurance seed has created the org.
      try {
        const channelCount = await IngestionChannel.count();
        if (channelCount === 0) {
          // eslint-disable-next-line no-console
          console.info('No ingestion channels found — seeding development channels and submissions');
          await new ChannelSeedService().seed();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Channel seed failed:', err);
      }

      // Slice 5.3 — fuel the credibility machinery: seed the platform-default
      // benchmark priors (the cited tranche) and the platform-default casualty
      // registry rows (ratingMethod=casualty_ilf). BOTH are idempotent (upsert by
      // scope), so this runs safely on every boot — re-running changes nothing. A
      // failure here is logged and swallowed so it can never block startup.
      try {
        await seedBenchmarkPriors();
        await seedCasualtyRegistryRows();
        // Slice 5.2 — platform-default cat_exposure registry row for
        // catastrophe_property (idempotent; no new table).
        await seedCatRegistryRows();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Benchmark prior / casualty registry seed failed:', err);
      }
    }

    await app.listen({
      host: '0.0.0.0',
      port: env.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }

  const shutdown = async (): Promise<void> => {
    await app.close();
    await closeSequelize();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void start();
