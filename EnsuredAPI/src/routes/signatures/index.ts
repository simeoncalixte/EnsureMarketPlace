import { FastifyPluginAsync } from 'fastify';
import {
  createRequestHandler,
  declineHandler,
  getRequestHandler,
  listRequestsHandler,
  signHandler,
  verifyHandler,
  voidHandler,
} from './handlers';
import {
  createRequestSchema,
  declineSchema,
  getRequestSchema,
  listRequestsSchema,
  signSchema,
  verifySchema,
  voidSchema,
} from './schemas';

/**
 * Standalone signature collection-point API (`/api/signatures`). It depends only
 * on the signature service + the org helper — no quote/policy/etc. coupling. Other
 * domains call THIS; it calls none of them. A subject is the opaque
 * (subjectType, subjectId) pair the caller supplies.
 */
export const signaturesRoute: FastifyPluginAsync = async (app) => {
  app.post('/signatures', { schema: createRequestSchema }, createRequestHandler);

  app.get('/signatures', { schema: listRequestsSchema }, listRequestsHandler);

  app.get('/signatures/:id', { schema: getRequestSchema }, getRequestHandler);

  app.post('/signatures/:id/signers/:signerId/sign', { schema: signSchema }, signHandler);

  app.post('/signatures/:id/signers/:signerId/decline', { schema: declineSchema }, declineHandler);

  app.post('/signatures/:id/void', { schema: voidSchema }, voidHandler);

  app.get('/signatures/:id/verify', { schema: verifySchema }, verifyHandler);
};
