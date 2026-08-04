/** Shared deal object shape returned by the dashboard and active-deals endpoints. */
const dealItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    investorUserId: { type: 'integer' },
    investorProfileId: { type: 'integer' },
    dealId: { type: 'integer' },
    dealName: { type: 'string' },
    dealStatus: { type: 'string' },
    trancheId: { type: 'integer' },
    trancheName: { type: 'string' },
    riskLevel: { type: 'string' },
    expectedReturnPct: { type: 'number' },
    capitalRequired: { type: 'number' },
    fundedAmount: { type: 'number' },
    pendingAmount: { type: 'number' },
    investorCommittedAmount: { type: 'number' },
    investorAllocationPct: { type: 'number' },
    status: { type: 'string', enum: ['active', 'available'] },
  },
  required: [
    'id',
    'investorUserId',
    'investorProfileId',
    'dealId',
    'dealName',
    'dealStatus',
    'trancheId',
    'trancheName',
    'riskLevel',
    'expectedReturnPct',
    'capitalRequired',
    'fundedAmount',
    'pendingAmount',
    'investorCommittedAmount',
    'investorAllocationPct',
    'status',
  ],
} as const;

const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
} as const;

export const defaultInvestorSchema = {
  tags: ['Investors'],
  summary: 'Get a default active investor',
  response: {
    200: {
      type: 'object',
      properties: {
        investorUserId: { type: 'integer' },
        investorProfileId: { type: 'integer' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['investorUserId', 'investorProfileId', 'firstName', 'lastName', 'email'],
    },
    404: errorSchema,
  },
} as const;

export const dashboardSchema = {
  tags: ['Investors'],
  summary: 'Load investor dashboard data',
  params: {
    type: 'object',
    properties: {
      investorUserId: { type: 'integer', minimum: 1 },
    },
    required: ['investorUserId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalInvested: { type: 'number' },
            totalAvailable: { type: 'number' },
            activePositions: { type: 'integer' },
            availableDeals: { type: 'integer' },
            blendedIrr: { type: 'number' },
            projectedAnnualReturn: { type: 'number' },
            capitalAtRisk: { type: 'number' },
            liveTranches: { type: 'integer' },
          },
          required: [
            'totalInvested',
            'totalAvailable',
            'activePositions',
            'availableDeals',
            'blendedIrr',
            'projectedAnnualReturn',
            'capitalAtRisk',
            'liveTranches',
          ],
        },
        deals: {
          type: 'array',
          items: dealItemSchema,
        },
      },
      required: ['summary', 'deals'],
    },
    404: errorSchema,
  },
} as const;

export const activeDealsSchema = {
  tags: ['Investors'],
  summary: 'List active deals applicable to an investor',
  params: {
    type: 'object',
    properties: {
      investorUserId: { type: 'integer', minimum: 1 },
    },
    required: ['investorUserId'],
  },
  response: {
    200: {
      type: 'array',
      items: dealItemSchema,
    },
    404: errorSchema,
  },
} as const;
