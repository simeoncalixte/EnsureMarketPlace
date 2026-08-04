import { FastifyReply, FastifyRequest } from 'fastify';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import {
  createSignatureRequest,
  declineSignature,
  getSignatureRequest,
  listRequestsForSubject,
  signSignature,
  verifySignatureRequest,
  voidSignatureRequest,
} from '../../services/signature/service';
import { requestDto, signatureDto } from './dto';

// Create a signature request (the collection envelope) + its pending signers.
export async function createRequestHandler(request: FastifyRequest, reply: FastifyReply) {
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
}

// List a subject's signature requests (callers look up by their own labels).
export async function listRequestsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { subjectType?: string; subjectId?: string };
  if (!query.subjectType || !query.subjectId) {
    return reply.code(400).send({ error: 'subjectType_and_subjectId_required' });
  }
  const requests = await listRequestsForSubject(query.subjectType, Number(query.subjectId));
  return reply.code(200).send({ items: requests.map(requestDto) });
}

// A request with its signers.
export async function getRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: number };
  const found = await getSignatureRequest(id);
  if (!found) return reply.code(404).send({ error: 'signature_request_not_found' });
  return reply.code(200).send({ request: requestDto(found.request), signatures: found.signatures.map(signatureDto) });
}

// Collect one signer's mark (typed | drawn | clickwrap) — stamps a proof.
export async function signHandler(request: FastifyRequest, reply: FastifyReply) {
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
}

// Decline to sign.
export async function declineHandler(request: FastifyRequest, reply: FastifyReply) {
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
}

// Void a request (cannot void a completed one).
export async function voidHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: number };
  try {
    const result = await voidSignatureRequest(id);
    return reply.code(200).send(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'void_failed';
    const code = message === 'signature_request_not_found' ? 404 : 409;
    return reply.code(code).send({ error: message });
  }
}

// Re-derive proofs and report record integrity.
export async function verifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: number };
  const result = await verifySignatureRequest(id);
  if (!result) return reply.code(404).send({ error: 'signature_request_not_found' });
  return reply.code(200).send(result);
}
