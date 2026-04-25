import Fastify, { FastifyInstance } from 'fastify';
import { healthRoute } from './routes/health';
import { organizationSeedRoute } from './routes/organizationSeed';
import { userSeedRoute } from './routes/userSeed';
import { reinsuranceSeedRoute } from './routes/reinsuranceSeed';
import { metricsSeedRoute } from './routes/metricsSeed';
import { myPortfolioSeedRoute } from './routes/myPortfolioSeed';
import { analyticsRoute } from './routes/analytics';
import { impersonationRoute } from './routes/impersonation';
import { authRoute } from './routes/auth';
import { organizationsRoute } from './routes/organizations';
import { usersRoute } from './routes/users';
import { underwritingSubmissionsRoute } from './routes/underwritingSubmissions';
import { marketplaceRoute } from './routes/marketplace';
import { investorsRoute } from './routes/investors';
import { ingestionChannelsRoute } from './routes/ingestionChannels';
import { getSequelize } from './config/database';
import registerSwagger from './swagger';
import { startPipelineProcessor } from './pipeline';
import { ingestionRoute } from './pipeline/ingestion/route';
import { classificationRoute } from './pipeline/classification/route';
import { ocrRoute } from './pipeline/ocr/route';
import { extractionRoute } from './pipeline/extraction/route';
import { normalizationRoute } from './pipeline/normalization/route';
import { validationRoute } from './pipeline/validation/route';
import { workflowRoute } from './pipeline/workflow/route';
import { storageSearchRoute } from './pipeline/storageSearch/route';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        // Allow union types in JSON Schema (e.g. type: ['string','integer'])
        allowUnionTypes: true,
      },
    },
  });
  // Manual CORS handling for development origins.
  // This avoids plugin version mismatches between @fastify/cors and fastify v5.
  const allowedDevOrigins = new Set(
    (process.env.CORS_ALLOW_ORIGINS
      ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:6006,http://127.0.0.1:6006,http://localhost:6007,http://127.0.0.1:6007')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin as string | undefined;
    if (!origin) return;
    if (process.env.NODE_ENV !== 'production' && allowedDevOrigins.has(origin)) {
      const reqHeaders = (request.headers['access-control-request-headers'] as string | undefined) ?? '';
      const defaultAllow = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-impersonator-user-id';
      const allowHeaders = reqHeaders ? `${defaultAllow}, ${reqHeaders}` : defaultAllow;

      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', allowHeaders);
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    if ((request.raw as any).method === 'OPTIONS') {
      reply.code(204).send();
      return reply;
    }
  });
  const sequelize = getSequelize();
  // register swagger docs first so its onRoute hook captures all routes
  app.register(healthRoute);
  app.register(organizationSeedRoute, { prefix: '/api' });
  app.register(userSeedRoute, { prefix: '/api' });
  app.register(reinsuranceSeedRoute, { prefix: '/api' });
  app.register(metricsSeedRoute, { prefix: '/api' });
  app.register(myPortfolioSeedRoute, { prefix: '/api' });
  app.register(marketplaceRoute, { prefix: '/api' });
  app.register(analyticsRoute, { prefix: '/api' });
  app.register(investorsRoute, { prefix: '/api' });
  app.register(organizationsRoute, { prefix: '/api' });
  app.register(usersRoute, { prefix: '/api' });
  app.register(impersonationRoute, { prefix: '/api' });
  app.register(authRoute, { prefix: '/api' });
  app.register(ingestionChannelsRoute, { prefix: '/api' });
  app.register(underwritingSubmissionsRoute, { prefix: '/api' });
  app.register(ingestionRoute, { prefix: '/api' });
  app.register(classificationRoute, { prefix: '/api' });
  app.register(ocrRoute, { prefix: '/api' });
  app.register(extractionRoute, { prefix: '/api' });
  app.register(normalizationRoute, { prefix: '/api' });
  app.register(validationRoute, { prefix: '/api' });
  app.register(workflowRoute, { prefix: '/api' });
  app.register(storageSearchRoute, { prefix: '/api' });
  // Optionally start background pipeline processor (disabled by default)
  if (process.env.PIPELINE_AUTO_START === 'true' && process.env.NODE_ENV !== 'test') {
    startPipelineProcessor();
  }
  return app;
}
