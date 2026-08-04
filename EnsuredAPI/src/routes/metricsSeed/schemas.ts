/** Fastify JSON schema for `POST /seed/exposure-time-series`. */
export const seedExposureTimeSeriesSchema = {
  description: 'Seed synthetic time-series capital exposure metrics for deals',
  body: {
    type: 'object',
    properties: {
      dealId: { type: 'integer' },
      points: { type: 'integer', default: 12, minimum: 1, maximum: 240 },
      startDate: { type: 'string', format: 'date' },
      includeAllActive: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  },
} as const;
