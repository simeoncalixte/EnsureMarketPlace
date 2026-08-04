import type { Signature, SignatureRequest } from '../../db/models';

export function requestDto(r: SignatureRequest) {
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

export function signatureDto(s: Signature) {
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
