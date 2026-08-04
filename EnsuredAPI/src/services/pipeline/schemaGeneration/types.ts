import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
  PageTemplateFieldType,
  PageTemplateOption,
  PageTemplateSectionDefinition,
} from '../../../db/models/pageTemplates.models';

/**
 * The form the schema-generation stage emits is a SUPERSET of the standard
 * create-coverage page template (`PageTemplateDefinition`): same field/section
 * vocabulary the existing renderer already understands, plus two affordances the
 * dynamic, per-submission form needs:
 *   - `currency` / `percentage` field types (insurance-specific money/rate inputs;
 *     they degrade to a number/text input in the current renderer — a dedicated
 *     renderer is a documented frontend follow-up).
 *   - `repeatable` sections, so a portfolio submission can render the insured-
 *     subject card list (one entry per object of insurance), mirroring the
 *     existing SubjectInsuranceSection.
 */
export type SuggestedFieldType = PageTemplateFieldType | 'currency' | 'percentage';

/**
 * Whether a section/field comes from the standardized base template (always
 * present, never overridden) or was added/suggested by the AI for this specific
 * submission. The create-coverage page renders both, but base parts are the
 * fixed scaffold the AI only extends.
 */
export type SchemaOrigin = 'base' | 'ai';

export type SuggestedFormField = Omit<PageTemplateFieldDefinition, 'type' | 'options'> & {
  type: SuggestedFieldType;
  options?: PageTemplateOption[];
  origin?: SchemaOrigin;
  /** Prefilled value for this field, taken from the submission's extracted data. */
  value?: string | number | boolean | null;
};

export type SuggestedFormSection = Omit<PageTemplateSectionDefinition, 'fields'> & {
  fields: SuggestedFormField[];
  /** When true the section renders as a repeatable card list (one per insured subject/item). */
  repeatable?: boolean;
  origin?: SchemaOrigin;
  /**
   * When set, this base section is rendered by an existing rich create-coverage
   * component (e.g. 'subjects', 'tranches', 'validation', 'submission', 'signing')
   * rather than from dynamic fields. AI extensions remain supported and render
   * beneath the component, while the component itself is never replaced.
   */
  component?: string | null;
};

export type SuggestedFormDefinition = Omit<PageTemplateDefinition, 'sections'> & {
  sections: SuggestedFormSection[];
};

/**
 * Everything the stage knows about the submission, distilled from the prior
 * stages' outputs (classification, extraction, validation). This is both the
 * heuristic baseline's input and what the LLM agent reasons over.
 */
export type SubmissionFormContext = {
  submissionId: number | null;
  organizationId: number | null;
  lineOfBusinessCode: string | null;
  lineOfBusinessLabel: string | null;
  lineOfBusinessSubTypeCode: string | null;
  lineOfBusinessSubTypeLabel: string | null;
  /** The insured party (named insured / policyholder), from extraction. */
  namedInsured: string | null;
  /** What is being insured — the subject-of-insurance descriptor, from extraction. */
  insuredSubject: string | null;
  riskType: string | null;
  triggerType: string | null;
  limit: number | null;
  deductible: number | null;
  expectedYield: number | null;
  effectiveDate: string | null;
  jurisdiction: string | null;
  propertyLocation: string | null;
  subjectCount: number | null;
  /** The extracted objects of insurance (see extraction stage `subjects`). */
  subjects: Array<Record<string, unknown>>;
  canonicalSubmissionView?: Record<string, unknown>;
  extractedPartyCandidates?: Array<{ role: string; name: string; source: string }>;
  resolvedOrganizations?: Record<string, { id: number | null; name: string | null; status: string | null }>;
  unresolvedPartyCandidates?: Array<Record<string, unknown>>;
  subjectPerils?: string[];
  subjectFinancials?: Array<Record<string, unknown>>;
  filterableCanonicalKeys?: string[];
  validationDecision: string | null;
  missingRequired: string[];
};

export type SchemaGenerationSource = 'gemini_schema' | 'heuristic_schema' | 'org_template';

export type SchemaGenerationResult = {
  schema: SuggestedFormDefinition;
  source: SchemaGenerationSource;
  context: SubmissionFormContext;
  generatedAt: string;
};
