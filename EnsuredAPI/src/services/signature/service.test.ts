// Mock the model layer so the signature service runs with no database.
jest.mock('../../db/models', () => ({
  SignatureRequest: { create: jest.fn(), findByPk: jest.fn() },
  Signature: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
}));

import { Signature, SignatureRequest } from '../../db/models';
import { createSignatureRequest, declineSignature, signSignature } from './service';

const createRequest = SignatureRequest.create as unknown as jest.Mock;
const findRequest = SignatureRequest.findByPk as unknown as jest.Mock;
const createSignature = Signature.create as unknown as jest.Mock;
const findSignature = Signature.findByPk as unknown as jest.Mock;
const findAllSignatures = Signature.findAll as unknown as jest.Mock;

beforeEach(() => {
  [createRequest, findRequest, createSignature, findSignature, findAllSignatures].forEach((m) => m.mockReset());
});

describe('createSignatureRequest', () => {
  it('requires at least one signer', async () => {
    await expect(createSignatureRequest({ subjectType: 'quote_version', subjectId: 1, documentContent: 'x', signers: [] }))
      .rejects.toThrow(/signers_required/);
  });

  it('requires a document (content or hash)', async () => {
    await expect(createSignatureRequest({ subjectType: 'quote_version', subjectId: 1, signers: [{ name: 'A' }] }))
      .rejects.toThrow(/document_required/);
  });

  it('hashes the document and opens a pending signer per party — for any opaque subject', async () => {
    createRequest.mockResolvedValue({ id: 7, documentHash: 'h' });
    createSignature.mockImplementation(async (attrs: Record<string, unknown>) => ({ id: 100, ...attrs }));

    const { request, signatures } = await createSignatureRequest({
      subjectType: 'quote_version', // opaque label — service has no Quote import
      subjectId: 42,
      documentContent: 'bound quote terms',
      signers: [{ name: 'ACME Inc.', role: 'insured' }, { name: 'Helios Re', role: 'carrier' }],
    });

    expect(request.id).toBe(7);
    expect(signatures).toHaveLength(2);
    // Document was hashed (not stored raw) and every signer starts pending.
    const created = createRequest.mock.calls[0][0];
    expect(created.subjectType).toBe('quote_version');
    expect(created.documentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createSignature).toHaveBeenCalledTimes(2);
    expect(createSignature.mock.calls[0][0]).toMatchObject({ signerName: 'ACME Inc.', status: 'pending', signingOrder: 1 });
  });
});

describe('signSignature', () => {
  function setup(otherSignerStatus: 'pending' | 'signed') {
    const signature = { id: 10, status: 'pending', signerName: 'ACME Inc.', signatureRequestId: 7, update: jest.fn() };
    const request = { id: 7, status: 'pending', documentHash: 'h', expiresAt: null, completedAt: null, update: jest.fn() };
    findSignature.mockResolvedValue(signature);
    findRequest.mockResolvedValue(request);
    // After signing, the rollup reads all signers: this one signed + the other.
    findAllSignatures.mockResolvedValue([{ status: 'signed' }, { status: otherSignerStatus }]);
    return { signature, request };
  }

  it('stamps a tamper-evident proof and completes the request when all have signed', async () => {
    const { signature, request } = setup('signed');
    const result = await signSignature(10, {
      captureType: 'typed',
      signatureData: 'ACME Inc.',
      now: () => new Date('2026-06-13T00:00:00.000Z'),
    });

    expect(signature.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'signed', captureType: 'typed', proof: expect.stringMatching(/^[0-9a-f]{64}$/), signedDocumentHash: 'h' }),
    );
    expect(result.requestStatus).toBe('completed');
    expect(request.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(result.proof).toMatch(/^[0-9a-f]{64}$/);
  });

  it('leaves the request partially_signed when others are still pending', async () => {
    setup('pending');
    const result = await signSignature(10, { captureType: 'clickwrap', signatureData: 'I agree' });
    expect(result.requestStatus).toBe('partially_signed');
  });

  it('refuses to sign an already-signed signer', async () => {
    findSignature.mockResolvedValue({ id: 10, status: 'signed', update: jest.fn() });
    await expect(signSignature(10, { captureType: 'typed', signatureData: 'x' })).rejects.toThrow(/signature_not_pending/);
  });

  it('refuses to sign against a closed request', async () => {
    findSignature.mockResolvedValue({ id: 10, status: 'pending', signerName: 'A', signatureRequestId: 7, update: jest.fn() });
    findRequest.mockResolvedValue({ id: 7, status: 'completed', documentHash: 'h', expiresAt: null, update: jest.fn() });
    await expect(signSignature(10, { captureType: 'typed', signatureData: 'x' })).rejects.toThrow(/request_not_open:completed/);
  });
});

describe('declineSignature', () => {
  it('declines the signer and fails the whole request', async () => {
    const signature = { id: 11, status: 'pending', signatureRequestId: 7, update: jest.fn() };
    findSignature.mockResolvedValue(signature);
    findRequest.mockResolvedValue({ id: 7, status: 'pending', update: jest.fn() });
    findAllSignatures.mockResolvedValue([{ status: 'declined' }, { status: 'pending' }]);

    const result = await declineSignature(11, 'terms not acceptable');
    expect(signature.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'declined', declinedReason: 'terms not acceptable' }));
    expect(result.requestStatus).toBe('declined');
  });
});
