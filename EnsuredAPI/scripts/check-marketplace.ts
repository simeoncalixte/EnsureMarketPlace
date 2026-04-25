import Fastify from 'fastify';
import { reinsuranceSeedRoute } from '../src/routes/reinsuranceSeed';
import { marketplaceRoute } from '../src/routes/marketplace';

async function main() {
  const app = Fastify({ logger: false });
  app.register(reinsuranceSeedRoute, { prefix: '/api' });
  app.register(marketplaceRoute, { prefix: '/api' });
  await app.ready();

  console.log('Seeding via route...');
  const seedRes = await app.inject({ method: 'POST', url: '/api/seed/reinsurance', payload: { investorCount: 3, tranchesPerDeal: 3 } });
  console.log('Seed status:', seedRes.statusCode);
  console.log('Seed payload:', seedRes.payload);

  const res = await app.inject({ method: 'GET', url: '/api/marketplace/opportunities/active-pending-funding' });
  console.log('Opportunities status:', res.statusCode);
  console.log('Opportunities payload:', res.payload);

  await app.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
