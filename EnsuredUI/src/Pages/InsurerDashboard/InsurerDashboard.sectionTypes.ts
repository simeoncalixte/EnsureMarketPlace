import type { LineOfBusinessPageTemplate } from './lineOfBusinessTaxonomy';

export type TrancheSubjectSelectionMode = 'all' | 'selective';

export type TrancheInput = {
  trancheId: string;
  name: string;
  layerMin: string;
  layerMax: string;
  returnRate: string;
  riskLevel: string;
  capitalRequired: string;
  subjectSelectionMode: TrancheSubjectSelectionMode;
  selectedSubjectIds: string[];
};

export type SubjectInput = {
  subjectId: string;
  subjectLabel: string;
  lineOfBusiness: string;
  lineOfBusinessSubType: string;
  fieldValues: Record<string, string>;
  /**
   * The per-subject form template extracted by the pipeline for THIS submission.
   * When present, SubjectTemplateFields renders it directly (the LLM-generated
   * form) instead of fetching the static LOB-keyed template. Absent for blank
   * drafts the underwriter adds by hand — those still resolve by line of business.
   */
  template?: LineOfBusinessPageTemplate | null;
};

export type SubjectGroupingMode = 'location' | 'separate';

export type GroupedSubject = {
  subject: SubjectInput;
  index: number;
};

export type SubjectGroup = {
  key: string;
  label: string;
  subjects: GroupedSubject[];
};

export type SubjectTextFieldKey = 'subjectLabel' | 'lineOfBusiness' | 'lineOfBusinessSubType';

export type CreateDealSectionId = 'deal' | 'financials' | 'subjects' | 'documents' | 'tranches' | 'validation' | 'submission' | 'signing';

export type DealSubmissionSeed = {
  submissionId: number;
  submissionNumber: string;
  cedent: string;
  lineOfBusiness: string;
  locationText?: string;
  region: string;
  premium: number;
  exposure: number;
  receivedLabel: string;
  owner: string;
  source: string;
  notes: string;
};
