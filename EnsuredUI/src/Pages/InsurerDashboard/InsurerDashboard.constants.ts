import type { CreateDealSectionId, SubjectTextFieldKey } from './InsurerDashboard.sectionTypes';

export const UNKNOWN_LOCATION_BUCKET = 'Unknown / Undefined';

export const subjectLocationFieldHints = [
  'location',
  'locationtext',
  'address',
  'street',
  'city',
  'state',
  'province',
  'region',
  'country',
  'postal',
  'zip',
  'site',
  'premises',
];

export const createDealSectionTabs: Array<{ id: CreateDealSectionId; label: string }> = [
  { id: 'deal', label: 'Deal Parameters' },
  { id: 'financials', label: 'Financials' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'tranches', label: 'Tranche Structure' },
  { id: 'validation', label: 'Validation' },
  { id: 'submission', label: 'Submission' },
  { id: 'signing', label: 'Signing' },
];

export const subjectTemplateBaseFieldKeys = new Set<SubjectTextFieldKey>([
  'subjectLabel',
  'lineOfBusiness',
  'lineOfBusinessSubType',
]);

export const legacyLineOfBusinessAliases: Array<{ pattern: RegExp; primary: string; subType?: string }> = [
  { pattern: /property\s*cat/i, primary: 'Property', subType: 'Catastrophe' },
  { pattern: /marine\s*cargo/i, primary: 'Ocean Marine', subType: 'Cargo' },
  { pattern: /trade\s*credit/i, primary: 'Trade Credit', subType: 'Whole Turnover' },
  { pattern: /energy\s*liability/i, primary: 'Energy Liability', subType: 'Operators Liability' },
  { pattern: /construction\s*all\s*risk/i, primary: 'Construction All Risk', subType: 'Civil Works' },
  { pattern: /cyber/i, primary: 'Cyber', subType: 'Network Security' },
  { pattern: /public\s*entity/i, primary: 'Public Entity', subType: 'Municipal Property' },
  { pattern: /professional\s*liability/i, primary: 'Professional Liability', subType: 'Consultants' },
  { pattern: /property/i, primary: 'Property', subType: 'All Risk' },
  { pattern: /marine/i, primary: 'Ocean Marine', subType: 'Cargo' },
];
