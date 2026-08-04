export const seedReinsuranceSchema = {
  description: 'Seed an end-to-end reinsurance package flow (identity, policies/exposures, SPV, tranches, commitments, claims).',
  body: {
    type: 'object',
    properties: {
      investorCount: { type: 'integer', minimum: 2, maximum: 50, default: 3 },
      policyCount: { type: 'integer', minimum: 1, maximum: 200, default: 8 },
      exposuresPerPolicy: { type: 'integer', minimum: 1, maximum: 50, default: 2 },
      tranchesPerDeal: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
    },
    additionalProperties: false,
  },
} as const;
