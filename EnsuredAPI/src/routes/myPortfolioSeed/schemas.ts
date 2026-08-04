/** Fastify JSON schema for `POST /seed/my-portfolio`. */
export const seedMyPortfolioSchema = {
  description: 'Seed a mock portfolio (deal + tranches + tokens) for the calling investor user.',
  body: {
    type: 'object',
    properties: {
      tranchesPerDeal: { type: 'integer', minimum: 1, default: 3 },
      extraInvestors: { type: 'integer', minimum: 0, default: 1 },
      policyCount: { type: 'integer', minimum: 1, default: 2 },
      exposuresPerPolicy: { type: 'integer', minimum: 1, default: 1 },
    },
  },
} as const;
