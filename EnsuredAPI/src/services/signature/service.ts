import { signatureCaptureTypes } from '../../db/models/constants';
import { Signature, SignatureRequest } from '../../db/models';
import {
  computeDocumentHash,
  computeSignatureProof,
  isRequestOpen,
  resolveSignatureSecret,
  rollupRequestStatus,
  verifySignatureProof,
} from './logic';

/**
 * Signature collection point — standalone orchestration. It imports ONLY its own
 * models, its pure logic, and the shared constants; it knows nothing about quotes,
 * policies, or any other domain. Callers attach a request to whatever they like via
 * the opaque (subjectType, subjectId) pair and read results back the same way.
 */

export type SignerInput = { name: string; email?: string | null; role?: string | null; order?: number | null };

export type CreateSignatureRequestInput = {
  subjectType: string;
  subjectId: number;
  signers: SignerInput[];
  // Provide either the raw document content (hashed here) or a precomputed hash.
  documentContent?: string;
  documentHash?: string;
  documentRef?: string | null;
  title?: string | null;
  organizationId?: number | null;
  expiresAt?: Date | string | null;
  createdByUserId?: number | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function createSignatureRequest(input: CreateSignatureRequestInput): Promise<{
  request: SignatureRequest;
  signatures: Signature[];
}> {
  const signers = Array.isArray(input.signers) ? input.signers.filter((s) => s && String(s.name ?? '').trim()) : [];
  if (signers.length === 0) throw new Error('signers_required');

  const documentHash = input.documentHash ?? (input.documentContent != null ? computeDocumentHash(input.documentContent) : null);
  if (!documentHash) throw new Error('document_required');

  const request = await SignatureRequest.create({
    organizationId: input.organizationId ?? null,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    title: input.title ?? null,
    documentHash,
    documentRef: input.documentRef ?? null,
    status: 'pending',
    expiresAt: toDate(input.expiresAt),
    completedAt: null,
    createdByUserId: input.createdByUserId ?? null,
  });

  const signatures: Signature[] = [];
  for (let i = 0; i < signers.length; i += 1) {
    const s = signers[i];
    signatures.push(
      await Signature.create({
        signatureRequestId: request.id,
        signerName: String(s.name).trim(),
        signerEmail: s.email ?? null,
        signerRole: s.role ?? null,
        signingOrder: s.order ?? i + 1,
        status: 'pending',
        captureType: null,
        signatureData: null,
        proof: null,
        signedDocumentHash: null,
        signedAt: null,
        declinedReason: null,
        ipAddress: null,
        userAgent: null,
        signedByUserId: null,
      }),
    );
  }

  return { request, signatures };
}

export async function getSignatureRequest(id: number): Promise<{ request: SignatureRequest; signatures: Signature[] } | null> {
  const request = await SignatureRequest.findByPk(id);
  if (!request) return null;
  const signatures = await Signature.findAll({ where: { signatureRequestId: id }, order: [['signingOrder', 'ASC'], ['id', 'ASC']] });
  return { request, signatures };
}

/** Look a subject's requests up without any coupling — callers pass their own labels. */
export async function listRequestsForSubject(subjectType: string, subjectId: number): Promise<SignatureRequest[]> {
  return SignatureRequest.findAll({ where: { subjectType, subjectId }, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
}

export type SignInput = {
  captureType: (typeof signatureCaptureTypes)[number];
  signatureData: string;
  signedByUserId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
};

export type SignResult = { signatureId: number; status: string; requestStatus: string; proof: string };

/** Collect one signer's mark, stamp a tamper-evident proof, and roll the request up. */
export async function signSignature(signatureId: number, input: SignInput): Promise<SignResult> {
  const signature = await Signature.findByPk(signatureId);
  if (!signature) throw new Error('signature_not_found');
  if (signature.status !== 'pending') throw new Error('signature_not_pending');

  const request = await SignatureRequest.findByPk(signature.signatureRequestId);
  if (!request) throw new Error('signature_request_not_found');
  if (!isRequestOpen(request.status)) throw new Error(`request_not_open:${request.status}`);
  if (request.expiresAt && (input.now ?? (() => new Date()))() > request.expiresAt) {
    await request.update({ status: 'expired' });
    throw new Error('request_expired');
  }

  const data = String(input.signatureData ?? '').trim();
  if (!data) throw new Error('signature_data_required');

  const now = (input.now ?? (() => new Date()))();
  const signedAt = now.toISOString();
  const secret = resolveSignatureSecret(input.env);
  const proof = computeSignatureProof(secret, {
    requestId: request.id,
    signatureId: signature.id,
    documentHash: request.documentHash,
    signerName: signature.signerName,
    captureType: input.captureType,
    signatureData: data,
    signedAt,
  });

  await signature.update({
    status: 'signed',
    captureType: input.captureType,
    signatureData: data,
    proof,
    signedDocumentHash: request.documentHash,
    signedAt: now,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    signedByUserId: input.signedByUserId ?? null,
  });

  const requestStatus = await recomputeRequestStatus(request, now);
  return { signatureId: signature.id, status: 'signed', requestStatus, proof };
}

export async function declineSignature(
  signatureId: number,
  reason: string | null,
  opts: { signedByUserId?: number | null; now?: () => Date } = {},
): Promise<{ signatureId: number; status: string; requestStatus: string }> {
  const signature = await Signature.findByPk(signatureId);
  if (!signature) throw new Error('signature_not_found');
  if (signature.status !== 'pending') throw new Error('signature_not_pending');

  const request = await SignatureRequest.findByPk(signature.signatureRequestId);
  if (!request) throw new Error('signature_request_not_found');
  if (!isRequestOpen(request.status)) throw new Error(`request_not_open:${request.status}`);

  await signature.update({ status: 'declined', declinedReason: reason ?? null, signedByUserId: opts.signedByUserId ?? null });
  const requestStatus = await recomputeRequestStatus(request, (opts.now ?? (() => new Date()))());
  return { signatureId: signature.id, status: 'declined', requestStatus };
}

export async function voidSignatureRequest(id: number): Promise<{ id: number; status: string }> {
  const request = await SignatureRequest.findByPk(id);
  if (!request) throw new Error('signature_request_not_found');
  if (request.status === 'completed') throw new Error('request_already_completed');
  await request.update({ status: 'voided' });
  return { id: request.id, status: 'voided' };
}

export type VerifyResult = {
  requestId: number;
  status: string;
  signatures: Array<{ signatureId: number; signerName: string; status: string; valid: boolean | null }>;
  tampered: boolean;
};

/** Re-derive every signed proof and report whether the record is intact. */
export async function verifySignatureRequest(id: number, env?: NodeJS.ProcessEnv): Promise<VerifyResult | null> {
  const request = await SignatureRequest.findByPk(id);
  if (!request) return null;
  const signatures = await Signature.findAll({ where: { signatureRequestId: id }, order: [['signingOrder', 'ASC'], ['id', 'ASC']] });
  const secret = resolveSignatureSecret(env);

  const rows = signatures.map((s) => {
    if (s.status !== 'signed') return { signatureId: s.id, signerName: s.signerName, status: s.status, valid: null };
    const valid = verifySignatureProof(
      secret,
      {
        requestId: request.id,
        signatureId: s.id,
        documentHash: s.signedDocumentHash ?? request.documentHash,
        signerName: s.signerName,
        captureType: s.captureType,
        signatureData: s.signatureData,
        signedAt: s.signedAt ? s.signedAt.toISOString() : '',
      },
      s.proof,
    );
    return { signatureId: s.id, signerName: s.signerName, status: s.status, valid };
  });

  return {
    requestId: request.id,
    status: request.status,
    signatures: rows,
    tampered: rows.some((r) => r.valid === false),
  };
}

/** Recompute + persist the envelope status from its signers' states. */
async function recomputeRequestStatus(request: SignatureRequest, now: Date): Promise<string> {
  const all = await Signature.findAll({ where: { signatureRequestId: request.id } });
  const rolled = rollupRequestStatus(all.map((s) => ({ status: s.status })));
  await request.update({ status: rolled, completedAt: rolled === 'completed' ? now : request.completedAt });
  return rolled;
}
