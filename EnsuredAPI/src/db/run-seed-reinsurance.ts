import { closeSequelize } from '../config/database';
import { ReinsuranceSeedService } from '../services/ReinsuranceSeedService';

async function run(): Promise<void> {
  const service = new ReinsuranceSeedService();

  try {
    const summary = await service.seedAll();
    console.log('Reinsurance seed completed:', JSON.stringify(summary, null, 2));
  } finally {
    await closeSequelize();
  }
}

run().catch((error) => {
  console.error('Reinsurance seed failed.', error);
  process.exitCode = 1;
});
