import {
  canonicalSignaturePayload,
  computeDocumentHash,
  computeSignatureProof,
  isRequestOpen,
  resolveSignatureSecret,
  rollupRequestStatus,
  SignaturePayload,
  verifySignatureProof,
} from './logic';

const SECRET = 'unit-test-secret'
const payload: SignaturePayload = {
  requestId: 1,
  signatureId: 10,
  documentHash: 'abc123',
  signerName: 'ACME Manufacturing Inc.',
  captureType: 'typed',
  signatureData: 'ACME Manufacturing Inc.',
  signedAt: '2026-06-13T00:00:00.000Z',
}

describe('signature logic — document hashing', () => {
  it('is deterministic and content-sensitive (SHA-256 hex)', () => {
    const h1 = computeDocumentHash('the bound quote terms')
    const h2 = computeDocumentHash('the bound quote terms')
    const h3 = computeDocumentHash('the bound quote terms.')
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('signature logic — tamper-evident proof (Node crypto, no third-party)', () => {
  it('verifies a proof computed over the same payload', () => {
    const proof = computeSignatureProof(SECRET, payload)
    expect(proof).toMatch(/^[0-9a-f]{64}$/)
    expect(verifySignatureProof(SECRET, payload, proof)).toBe(true)
  })

  it('detects any alteration of the signed payload', () => {
    const proof = computeSignatureProof(SECRET, payload)
    expect(verifySignatureProof(SECRET, { ...payload, signatureData: 'someone else' }, proof)).toBe(false)
    expect(verifySignatureProof(SECRET, { ...payload, documentHash: 'tampered' }, proof)).toBe(false)
    expect(verifySignatureProof(SECRET, { ...payload, signedAt: '2026-06-14T00:00:00.000Z' }, proof)).toBe(false)
  })

  it('fails verification under a different secret or a missing proof', () => {
    const proof = computeSignatureProof(SECRET, payload)
    expect(verifySignatureProof('other-secret', payload, proof)).toBe(false)
    expect(verifySignatureProof(SECRET, payload, null)).toBe(false)
  })

  it('canonical payload is order-stable', () => {
    expect(canonicalSignaturePayload(payload)).toBe(canonicalSignaturePayload({ ...payload }))
  })

  it('resolves a secret from env with a documented dev default', () => {
    expect(resolveSignatureSecret({ SIGNATURE_SECRET: 'prod-key' } as NodeJS.ProcessEnv)).toBe('prod-key')
    expect(resolveSignatureSecret({} as NodeJS.ProcessEnv)).toMatch(/dev-signature-secret/)
  })
})

describe('signature logic — request status rollup', () => {
  it('rolls signer states up into the envelope status', () => {
    expect(rollupRequestStatus([])).toBe('pending')
    expect(rollupRequestStatus([{ status: 'pending' }, { status: 'pending' }])).toBe('pending')
    expect(rollupRequestStatus([{ status: 'signed' }, { status: 'pending' }])).toBe('partially_signed')
    expect(rollupRequestStatus([{ status: 'signed' }, { status: 'signed' }])).toBe('completed')
    expect(rollupRequestStatus([{ status: 'signed' }, { status: 'declined' }])).toBe('declined')
  })

  it('knows which statuses still accept signer actions', () => {
    expect(isRequestOpen('pending')).toBe(true)
    expect(isRequestOpen('partially_signed')).toBe(true)
    expect(isRequestOpen('completed')).toBe(false)
    expect(isRequestOpen('voided')).toBe(false)
    expect(isRequestOpen('expired')).toBe(false)
  })
})
