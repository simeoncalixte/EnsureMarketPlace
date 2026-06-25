import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { signatureRequestStatuses } from '../db/models/constants';

/**
 * Pure signature logic — integrity via Node's built-in `crypto`, NOT a third-party
 * e-sign library. No DB and no other-domain imports, so the hashing, the
 * tamper-evident proof, and the request-status rollup are all unit-testable.
 *
 * The "signature" here is a tamper-evident attestation: an HMAC-SHA256 `proof`
 * over the canonical (document hash + signer + captured mark + timestamp), keyed
 * by a server secret. Re-deriving the proof and comparing detects any later
 * alteration of the signed record — a defensible audit primitive without a vendor.
 */

export type RequestStatus = (typeof signatureRequestStatuses)[number];

/** SHA-256 (hex) of the document content the signers attest to. */
export function computeDocumentHash(content: string): string {
  return createHash('sha256').update(String(content ?? ''), 'utf8').digest('hex');
}

/** The exact bytes a signature proof is computed over. */
export type SignaturePayload = {
  requestId: number;
  signatureId: number;
  documentHash: string;
  signerName: string;
  captureType: string | null;
  signatureData: string | null;
  signedAt: string; // ISO 8601
};

/** Deterministic serialization of the payload (fixed key order). */
export function canonicalSignaturePayload(p: SignaturePayload): string {
  return JSON.stringify([
    p.requestId,
    p.signatureId,
    p.documentHash,
    p.signerName,
    p.captureType ?? '',
    p.signatureData ?? '',
    p.signedAt,
  ]);
}

/** HMAC-SHA256 (hex) tamper-evident proof of a signature. */
export function computeSignatureProof(secret: string, payload: SignaturePayload): string {
  return createHmac('sha256', secret).update(canonicalSignaturePayload(payload), 'utf8').digest('hex');
}

/** Constant-time verification that a stored proof matches the (re-derived) payload. */
export function verifySignatureProof(secret: string, payload: SignaturePayload, proof: string | null): boolean {
  if (!proof) return false;
  const expected = computeSignatureProof(secret, payload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(proof, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Resolve the HMAC secret from the environment, with a documented dev default. */
export function resolveSignatureSecret(env: NodeJS.ProcessEnv = process.env): string {
  // In production SIGNATURE_SECRET MUST be set; the default keeps dev/tests working
  // deterministically and is never a real key.
  return env.SIGNATURE_SECRET && env.SIGNATURE_SECRET.length > 0
    ? env.SIGNATURE_SECRET
    : 'dev-signature-secret-not-for-production';
}

/**
 * Roll the per-signer states up into the request envelope status. (pure)
 * Any decline fails the whole request; all signed completes it; some signed is
 * partial; otherwise pending. `voided` / `expired` are set explicitly elsewhere.
 */
export function rollupRequestStatus(signatures: Array<{ status: string }>): RequestStatus {
  if (signatures.length === 0) return 'pending';
  if (signatures.some((s) => s.status === 'declined')) return 'declined';
  if (signatures.every((s) => s.status === 'signed')) return 'completed';
  if (signatures.some((s) => s.status === 'signed')) return 'partially_signed';
  return 'pending';
}

/** Whether a request is in a state that still accepts signer actions. (pure) */
export function isRequestOpen(status: string): boolean {
  return status === 'pending' || status === 'partially_signed';
}
