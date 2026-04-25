import { buildApp } from './app';
import { env } from './config/env';
import { closeSequelize, getSequelize } from './config/database';
import { createMigrator } from './db/migrator';
import { ReinsuranceSeedService } from './services/ReinsuranceSeedService';
import { Deal } from './db/models';

async function start(): Promise<void> {
  const app = buildApp();
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    await createMigrator(sequelize).up();

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
