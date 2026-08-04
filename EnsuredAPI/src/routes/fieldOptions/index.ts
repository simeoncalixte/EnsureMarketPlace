import { FastifyPluginAsync } from 'fastify';
import {
  resolveOptionSetHandler,
  addOptionSetItemHandler,
  removeOptionSetItemHandler,
  listEntityHandler,
} from './handlers';

/**
 * Unified field-options API. One vocabulary the UI's <DynamicSelect> speaks for
 * every dynamic dropdown:
 *   - option sets  → tenant-overridable picklists (global default + tenant overlay)
 *   - entities     → live org-scoped reference rows (department / team / user)
 * Org-scoped via the path; entity writes (dept/team CRUD) reuse the departments API.
 * See ./README.md for the concern map.
 */
export const fieldOptionsRoute: FastifyPluginAsync = async (app) => {
  // ── Option sets (tenant-overridable picklists) ──
  app.get('/organizations/:id/field-options/option-set/:key', resolveOptionSetHandler);
  app.post('/organizations/:id/field-options/option-set/:key/items', addOptionSetItemHandler);
  app.delete('/organizations/:id/field-options/option-set/:key/items/:value', removeOptionSetItemHandler);

  // ── Entities (live reference data → {value:id, label}) ──
  app.get('/organizations/:id/field-options/entity/:entity', listEntityHandler);
};

export default fieldOptionsRoute;
