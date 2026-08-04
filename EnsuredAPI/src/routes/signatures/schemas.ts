export const createRequestSchema = {
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
} as const;

export const listRequestsSchema = {
  description: 'List signature requests for a subject (subjectType + subjectId query).',
} as const;

export const getRequestSchema = {
  description: 'A signature request with its signers.',
  params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
} as const;

export const signSchema = {
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
} as const;

export const declineSchema = {
  description: 'Decline to sign.',
  params: { type: 'object', required: ['id', 'signerId'], properties: { id: { type: 'integer' }, signerId: { type: 'integer' } } },
  body: { type: 'object', additionalProperties: false, properties: { reason: { type: 'string' } } },
} as const;

export const voidSchema = {
  description: 'Void a signature request.',
  params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
} as const;

export const verifySchema = {
  description: 'Re-derive every signed proof and report whether the record is intact.',
  params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
} as const;
