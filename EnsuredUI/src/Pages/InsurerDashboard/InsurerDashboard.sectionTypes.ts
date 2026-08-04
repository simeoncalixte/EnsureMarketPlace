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
