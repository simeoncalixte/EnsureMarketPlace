import { SCENARIO_KEYS } from '../../services/submissionScenarios';
import { SUBMISSION_TYPE_CODES } from '../../db/seed-data/submissionTypeTaxonomy';

export const seedPipelineSubmissionsSchema = {
  description:
    "Seed incoming submissions into the calling user's organization so the ingestion pipeline can be tested manually on the Pipeline Processes board.",
  body: {
    type: 'object',
    properties: {
      count: { type: 'integer', minimum: 1, maximum: 50, default: 3 },
      ensureSubscriptions: { type: 'boolean', default: true },
      attachDocuments: { type: 'boolean', default: true },
      scenario: {
        type: 'string',
        enum: ['weighted', ...SCENARIO_KEYS],
        default: 'weighted',
        description:
          "Business scenario to seed. 'weighted' (default) draws the standard mix; a specific key seeds the whole batch as that scenario.",
      },
      submissionType: {
        type: 'string',
        enum: ['auto', ...SUBMISSION_TYPE_CODES],
        default: 'auto',
        description:
          "Pin the transaction type for the batch so each card is unambiguously a new-business / renewal / quote-request / endorsement / claim / … submission in the pipeline. 'auto' (default) leaves the type to the submissionType stage.",
      },
    },
  },
  response: {
    201: { type: 'object', additionalProperties: true },
  },
} as const;

export const seedPipelineFlowSchema = {
  description:
    "Simulate a multi-stage pipeline history for the org's existing submissions (no OCR/LLM run) so the board fans across lanes and the Pipeline Flow Sankey has real stage transitions to draw.",
  body: {
    type: 'object',
    properties: {
      reset: {
        type: 'boolean',
        default: true,
        description: 'Clear prior simulated (non-received) events first so repeated calls reset rather than pile up.',
      },
    },
  },
  response: { 201: { type: 'object', additionalProperties: true } },
} as const;
