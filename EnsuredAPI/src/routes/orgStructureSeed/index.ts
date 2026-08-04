import { FastifyPluginAsync } from 'fastify';
import { seedOrgStructureSchema } from './schemas';
import { seedOrgStructureHandler } from './handlers';

/**
 * Seeds a full organizational structure (departments + teams) for one
 * organization and populates it with users, each assigned a role and placed into
 * a department/team. Registered under the `/api` prefix (see app.ts).
 */
export const orgStructureSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/org-structure', { schema: seedOrgStructureSchema }, seedOrgStructureHandler);
};

export default orgStructureSeedRoute;
