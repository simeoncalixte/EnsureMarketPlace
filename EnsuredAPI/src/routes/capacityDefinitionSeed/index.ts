import { FastifyPluginAsync } from 'fastify';
import { seedCapacityDefinitionsSchema } from './schemas';
import { seedCapacityDefinitionsHandler } from './handlers';

/**
 * Seeds a fully-populated, ACTIVE CapacityDefinition per organization (matching
 * the Capacity editor 1:1 and carrying the authoritative enforcement appetite
 * block) so the ingestion/validation pipeline can be tested for adherence to
 * each organization's rules. Registered under the `/api` prefix (see app.ts).
 */
export const capacityDefinitionSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/capacity-definitions', { schema: seedCapacityDefinitionsSchema }, seedCapacityDefinitionsHandler);
};

export default capacityDefinitionSeedRoute;
