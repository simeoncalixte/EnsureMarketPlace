import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

async function registerSwagger(app: FastifyInstance) {
  await app.register(fastifySwagger as any, {
    openapi: {
      info: {
        title: 'Ensured API',
        description: 'API documentation for Ensured Marketplace',
        version: '0.1.0',
      },
    },
    exposeRoute: true,
  });

  await app.register(fastifySwaggerUi as any, {
    routePrefix: '/docs',
    uiConfig: {
      defaultModelsExpandDepth: -1,
    },
    staticCSP: false,
    transformStaticCSP: (header: string) => header,
  });
}

export default fp(registerSwagger);
