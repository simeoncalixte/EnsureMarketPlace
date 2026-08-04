export const purgeSubmissionsSchema = {
  description:
    'Remove ALL submissions and associated business data (ingestion/pipeline, underwriting, capital markets). Organizations, users and their profiles are kept. Requires { "confirm": true }.',
  body: {
    type: 'object',
    properties: {
      confirm: { type: 'boolean', description: 'Must be true to perform the purge.' },
    },
  },
  response: {
    200: { type: 'object', additionalProperties: true },
    400: { type: 'object', additionalProperties: true },
    500: { type: 'object', additionalProperties: true },
  },
} as const;
