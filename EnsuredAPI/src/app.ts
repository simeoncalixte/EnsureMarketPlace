import Fastify, { FastifyInstance } from 'fastify';
import { healthRoute } from './routes/health';
import { organizationSeedRoute } from './routes/organizationSeed';
import { userSeedRoute } from './routes/userSeed';
import { orgStructureSeedRoute } from './routes/orgStructureSeed';
import { capacityDefinitionSeedRoute } from './routes/capacityDefinitionSeed';
import { reinsuranceSeedRoute } from './routes/reinsuranceSeed';
import { ingestionChannelSeedRoute } from './routes/ingestionChannelSeed';
import { pipelineSubmissionSeedRoute } from './routes/pipelineSubmissionSeed';
import { submissionPurgeRoute } from './routes/submissionPurge';
import { metricsSeedRoute } from './routes/metricsSeed';
import { myPortfolioSeedRoute } from './routes/myPortfolioSeed';
import { analyticsRoute } from './routes/analytics';
import { impersonationRoute } from './routes/impersonation';
import { authRoute } from './routes/auth';
import { oauthRoute } from './routes/oauth';
import { navigationRoute } from './routes/navigation';
import { registrationRoute } from './routes/registration';
import { subscriptionsRoute } from './routes/subscriptions';
import { organizationsRoute } from './routes/organizations';
import { governanceRoute } from './routes/governance';
import { usersRoute } from './routes/users';
import { departmentsRoute } from './routes/departments';
import { fieldOptionsRoute } from './routes/fieldOptions';
import { partnersRoute } from './routes/partners';
import { underwritingSubmissionsRoute } from './routes/underwritingSubmissions';
import { signaturesRoute } from './routes/signatures';
import { marketplaceRoute } from './routes/marketplace';
import { crestaZonesRoute } from './routes/crestaZones';
import { worldcitiesSeedRoute } from './routes/worldcitiesSeed';
import { geolocationRoute } from './routes/geolocation';
import { riskLayersRoute } from './routes/riskLayers';
import { investorsRoute } from './routes/investors';
import { ingestionChannelsRoute } from './routes/ingestionChannels';
import { pipelineProcessesRoute } from './routes/pipelineProcesses';
import { getSequelize } from './config/database';
import registerSwagger from './swagger';
import { ingestionRoute } from './pipeline/ingestion/route';
import { classificationRoute } from './pipeline/classification/route';
import { ocrRoute } from './pipeline/ocr/route';
import { submissionTypeRoute } from './pipeline/submissionType/route';
import { assignmentRoute } from './pipeline/assignment/route';
import { extractionRoute } from './pipeline/extraction/route';
import { insuredSubjectRoute } from './pipeline/insuredSubject/route';
import { locationDiscoveryRoute } from './pipeline/locationDiscovery/route';
import { normalizationRoute } from './pipeline/normalization/route';
import { validationRoute } from './pipeline/validation/route';
import { schemaGenerationRoute } from './pipeline/schemaGeneration/route';
import { workflowRoute } from './pipeline/workflow/route';
import { storageSearchRoute } from './pipeline/storageSearch/route';
import websocketPlugin from '@fastify/websocket';
import { socialProfilesRoutes } from './routes/socialProfiles';
import { socialConnectionsRoutes } from './routes/socialConnections';
import { socialFeedRoutes } from './routes/socialFeed';
import { socialMessagesRoutes } from './routes/socialMessages';
import { socialIntegrationsRoutes } from './routes/socialIntegrations';
import { socialWebhooksRoutes } from './routes/socialWebhooks';
import { socialSocketRoute } from './routes/socialSocket';

/**
 * Register the consistent error envelope used across the API. Any uncaught throw,
 * schema validation failure, or thrown HTTP error becomes a predictable JSON shape
 * ({ ok, error, code, statusCode, requestId }) instead of Fastify's default — so
 * the frontend can always read `ok`/`error` and correlate via `requestId`.
 * Internal 5xx messages are masked in production.
 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const validation = (error as { validation?: unknown }).validation;
    const fromStatus = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : undefined;
    const statusCode = validation ? 400 : fromStatus ?? 500;

    if (statusCode >= 500) request.log.error({ err: error, reqId: request.id }, 'unhandled request error');
    else request.log.warn({ err: error, reqId: request.id }, 'request error');

    const exposeMessage = statusCode < 500 || process.env.NODE_ENV !== 'production';
    reply.code(statusCode).send({
      ok: false,
      error: exposeMessage ? error.message || 'Internal Server Error' : 'Internal Server Error',
      code: validation
        ? 'VALIDATION_ERROR'
        : (error as { code?: string }).code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      statusCode,
      requestId: request.id,
      ...(validation ? { details: validation } : {}),
    });
  });

  // Unknown routes get the same envelope (instead of Fastify's default 404 body).
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      ok: false,
      error: `Route ${request.method}:${request.url} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
      requestId: request.id,
    });
  });
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      serializers: {
        // The websocket upgrade carries the JWT as a query param (browsers
        // cannot set headers on WS handshakes) — keep it out of the logs.
        req(request) {
          return {
            method: request.method,
            url: request.url.replace(/([?&]token=)[^&]+/g, '$1[redacted]'),
            hostname: request.hostname,
            remoteAddress: request.ip,
            remotePort: request.socket?.remotePort,
          };
        },
      },
    },
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
  registerErrorHandlers(app);

  const sequelize = getSequelize();
  // register swagger docs first so its onRoute hook captures all routes
  app.register(healthRoute);
  app.register(organizationSeedRoute, { prefix: '/api' });
  app.register(userSeedRoute, { prefix: '/api' });
  app.register(orgStructureSeedRoute, { prefix: '/api' });
  app.register(capacityDefinitionSeedRoute, { prefix: '/api' });
  app.register(reinsuranceSeedRoute, { prefix: '/api' });
  app.register(ingestionChannelSeedRoute, { prefix: '/api' });
  app.register(pipelineSubmissionSeedRoute, { prefix: '/api' });
  app.register(submissionPurgeRoute, { prefix: '/api' });
  app.register(metricsSeedRoute, { prefix: '/api' });
  app.register(myPortfolioSeedRoute, { prefix: '/api' });
  app.register(marketplaceRoute, { prefix: '/api' });
  app.register(crestaZonesRoute, { prefix: '/api' });
  app.register(worldcitiesSeedRoute, { prefix: '/api' });
  app.register(geolocationRoute, { prefix: '/api' });
  app.register(riskLayersRoute, { prefix: '/api' });
  app.register(analyticsRoute, { prefix: '/api' });
  app.register(investorsRoute, { prefix: '/api' });
  app.register(organizationsRoute, { prefix: '/api' });
  app.register(governanceRoute, { prefix: '/api' });
  app.register(usersRoute, { prefix: '/api' });
  app.register(departmentsRoute, { prefix: '/api' });
  app.register(fieldOptionsRoute, { prefix: '/api' });
  app.register(partnersRoute, { prefix: '/api' });
  app.register(impersonationRoute, { prefix: '/api' });
  app.register(authRoute, { prefix: '/api' });
  app.register(oauthRoute, { prefix: '/api' });
  app.register(navigationRoute, { prefix: '/api' });
  app.register(registrationRoute, { prefix: '/api' });
  app.register(subscriptionsRoute, { prefix: '/api' });
  app.register(ingestionChannelsRoute, { prefix: '/api' });
  app.register(pipelineProcessesRoute, { prefix: '/api' });
  app.register(underwritingSubmissionsRoute, { prefix: '/api' });
  app.register(signaturesRoute, { prefix: '/api' });
  app.register(ingestionRoute, { prefix: '/api' });
  app.register(classificationRoute, { prefix: '/api' });
  app.register(ocrRoute, { prefix: '/api' });
  app.register(submissionTypeRoute, { prefix: '/api' });
  app.register(assignmentRoute, { prefix: '/api' });
  app.register(extractionRoute, { prefix: '/api' });
  app.register(insuredSubjectRoute, { prefix: '/api' });
  app.register(locationDiscoveryRoute, { prefix: '/api' });
  app.register(normalizationRoute, { prefix: '/api' });
  app.register(validationRoute, { prefix: '/api' });
  app.register(schemaGenerationRoute, { prefix: '/api' });
  app.register(workflowRoute, { prefix: '/api' });
  app.register(storageSearchRoute, { prefix: '/api' });
  app.register(websocketPlugin);
  app.register(socialProfilesRoutes, { prefix: '/api' });
  app.register(socialConnectionsRoutes, { prefix: '/api' });
  app.register(socialFeedRoutes, { prefix: '/api' });
  app.register(socialMessagesRoutes, { prefix: '/api' });
  app.register(socialIntegrationsRoutes, { prefix: '/api' });
  app.register(socialWebhooksRoutes, { prefix: '/api' });
  app.register(socialSocketRoute, { prefix: '/api' });
  // The pipeline is now driven manually, one stage at a time, from the Pipeline
  // Processes board (see pipeline/board/service.advanceSubmissionToNextStage).
  // There is no background auto-processor to start here.
  return app;
}
