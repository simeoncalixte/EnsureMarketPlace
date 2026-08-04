export const financialHealthSchema = {
  tags: ['Analytics'],
  summary: 'Monthly financial health: GWP, earned premium, loss ratio, combined ratio',
  querystring: {
    type: 'object',
    properties: { months: { type: 'integer', default: 12, minimum: 1, maximum: 36 } },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'string' },
          gwp: { type: 'number' },
          earnedPremium: { type: 'number' },
          lossAmount: { type: 'number' },
          lossRatio: { type: 'number' },
          expenseRatio: { type: 'number' },
          combinedRatio: { type: 'number' },
        },
      },
    },
  },
} as const;

export const profitabilityByLobSchema = {
  tags: ['Analytics'],
  summary: 'Written premium, incurred losses and net per line of business',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'string' },
          premium: { type: 'number' },
          losses: { type: 'number' },
          net: { type: 'number' },
        },
      },
    },
  },
} as const;

export const capitalAdequacySchema = {
  tags: ['Analytics'],
  summary: 'Monthly solvency ratio: committed capital / required capital (VaR95)',
  querystring: {
    type: 'object',
    properties: { months: { type: 'integer', default: 12, minimum: 1, maximum: 36 } },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'string' },
          solvencyRatio: { type: 'number' },
          totalCapital: { type: 'number' },
          requiredCapital: { type: 'number' },
        },
      },
    },
  },
} as const;

export const reinsuranceUtilizationSchema = {
  tags: ['Analytics'],
  summary: 'Retained vs ceded capital by tranche risk level',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          retained: { type: 'number' },
          ceded: { type: 'number' },
        },
      },
    },
  },
} as const;

export const exposureConcentrationSchema = {
  tags: ['Analytics'],
  summary: 'Exposure concentration by region × peril type',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          perilType: { type: 'string' },
          exposure: { type: 'number' },
        },
      },
    },
  },
} as const;
