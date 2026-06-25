import { FastifyPluginAsync } from 'fastify';
import type { Signature, SignatureRequest } from '../db/models';
import { resolveOrganizationIdFromRequest } from '../lib/org';
import {
  createSignatureRequest,
  declineSignature,
  getSignatureRequest,
  listRequestsForSubject,
  signSignature,
  verifySignatureRequest,
  voidSignatureRequest,
} from '../signature/service';

/**
 * Standalone signature collection-point API (`/api/signatures`). It depends only
 * on the signature service + the org helper — no quote/policy/etc. coupling. Other
 * domains call THIS; it calls none of them. A subject is the opaque
 * (subjectType, subjectId) pair the caller supplies.
 */

function requestDto(r: SignatureRequest) {
  return {
    id: r.id,
    organizationId: r.organizationId,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    title: r.title,
    documentHash: r.documentHash,
    documentRef: r.documentRef,
    status: r.status,
    expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
  };
}

function signatureDto(s: Signature) {
  return {
    id: s.id,
    signerName: s.signerName,
    signerEmail: s.signerEmail,
    signerRole: s.signerRole,
    signingOrder: s.signingOrder,
    status: s.status,
    captureType: s.captureType,
    signatureData: s.signatureData,
    proof: s.proof,
    signedDocumentHash: s.signedDocumentHash,
    signedAt: s.signedAt ? new Date(s.signedAt).toISOString() : null,
    declinedReason: s.declinedReason,
  };
}

export const signaturesRoute: FastifyPluginAsync = async (app) => {
  // Create a signature request (the collection envelope) + its pending signers.
  app.post(
    '/signatures',
    {
      schema: {
        description: 'Open a signature request for an opaque subject (subjectType + subjectId) with one or more signers.',
        body: {
          type: 'object',
          required: ['subjectType', 'subjectId', 'signers'],
          additionalProperties: false,
          properties: {
            subjectType: { type: 'string', minLength: 1 },
            subjectId: { type: 'integer' },
            title: { type: 'string' },
            documentContent: { type: 'string' },
            documentHash: { type: 'string' },
            documentRef: { type: 'string' },
            expiresAt: { type: 'string' },
            signers: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['name'],
                additionalProperties: false,
                properties: {
                  name: { type: 'string', minLength: 1 },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  order: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const organizationId = await resolveOrganizationIdFromRequest(request);
      try {
        const { request: req, signatures } = await createSignatureRequest({
          subjectType: String(body.subjectType),
          subjectId: Number(body.subjectId),
          title: (body.title as string) ?? null,
          documentContent: body.documentContent as string | undefined,
          documentHash: body.documentHash as string | undefined,
          documentRef: (body.documentRef as string) ?? null,
          expiresAt: (body.expiresAt as string) ?? null,
          organizationId: organizationId ?? null,
          signers: body.signers as Array<{ name: string; email?: string; role?: string; order?: number }>,
        });
        return reply.code(201).send({ request: requestDto(req), signatures: signatures.map(signatureDto) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'signature_request_failed';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // List a subject's signature requests (callers look up by their own labels).
  app.get('/signatures', { schema: { description: 'List signature requests for a subject (subjectType + subjectId query).' } }, async (request, reply) => {
    const query = request.query as { subjectType?: string; subjectId?: string };
    if (!query.subjectType || !query.subjectId) {
      return reply.code(400).send({ error: 'subjectType_and_subjectId_required' });
    }
    const requests = await listRequestsForSubject(query.subjectType, Number(query.subjectId));
    return reply.code(200).send({ items: requests.map(requestDto) });
  });

  // A request with its signers.
  app.get(
    '/signatures/:id',
    { schema: { description: 'A signature request with its signers.', params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const found = await getSignatureRequest(id);
      if (!found) return reply.code(404).send({ error: 'signature_request_not_found' });
      return reply.code(200).send({ request: requestDto(found.request), signatures: found.signatures.map(signatureDto) });
    },
  );

  // Collect one signer's mark (typed | drawn | clickwrap) — stamps a proof.
  app.post(
    '/signatures/:id/signers/:signerId/sign',
    {
      schema: {
        description: 'Collect a signer\'s mark and stamp a tamper-evident proof.',
        params: { type: 'object', required: ['id', 'signerId'], properties: { id: { type: 'integer' }, signerId: { type: 'integer' } } },
        body: {
          type: 'object',
          required: ['captureType', 'signatureData'],
          additionalProperties: false,
          properties: {
            captureType: { type: 'string', enum: ['typed', 'drawn', 'clickwrap'] },
            signatureData: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, signerId } = request.params as { id: number; signerId: number };
      const body = request.body as { captureType: 'typed' | 'drawn' | 'clickwrap'; signatureData: string };

      const found = await getSignatureRequest(id);
      if (!found) return reply.code(404).send({ error: 'signature_request_not_found' });
      if (!found.signatures.some((s) => s.id === Number(signerId))) {
        return reply.code(404).send({ error: 'signer_not_found' });
      }

      try {
        const result = await signSignature(Number(signerId), {
          captureType: body.captureType,
          signatureData: body.signatureData,
          ipAddress: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string) ?? null,
        });
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'sign_failed';
        return reply.code(409).send({ error: message });
      }
    },
  );

  // Decline to sign.
  app.post(
    '/signatures/:id/signers/:signerId/decline',
    {
      schema: {
        description: 'Decline to sign.',
        params: { type: 'object', required: ['id', 'signerId'], properties: { id: { type: 'integer' }, signerId: { type: 'integer' } } },
        body: { type: 'object', additionalProperties: false, properties: { reason: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { id, signerId } = request.params as { id: number; signerId: number };
      const { reason } = (request.body ?? {}) as { reason?: string };

      const found = await getSignatureRequest(id);
      if (!found) return reply.code(404).send({ error: 'signature_request_not_found' });
      if (!found.signatures.some((s) => s.id === Number(signerId))) {
        return reply.code(404).send({ error: 'signer_not_found' });
      }

      try {
        const result = await declineSignature(Number(signerId), reason ?? null);
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'decline_failed';
        return reply.code(409).send({ error: message });
      }
    },
  );

  // Void a request (cannot void a completed one).
  app.post(
    '/signatures/:id/void',
    { schema: { description: 'Void a signature request.', params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      try {
        const result = await voidSignatureRequest(id);
        return reply.code(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'void_failed';
        const code = message === 'signature_request_not_found' ? 404 : 409;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // Re-derive proofs and report record integrity.
  app.get(
    '/signatures/:id/verify',
    { schema: { description: 'Re-derive every signed proof and report whether the record is intact.', params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } } },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const result = await verifySignatureRequest(id);
      if (!result) return reply.code(404).send({ error: 'signature_request_not_found' });
      return reply.code(200).send(result);
    },
  );
};
