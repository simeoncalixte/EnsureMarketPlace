import { assetTypes, constructionTypes, occupancyTypes } from '../models/constants';
import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
  PageTemplateOption,
  PageTemplateSectionLayoutDefinition,
} from '../models/pageTemplates.models';
import { lineOfBusinessTaxonomy } from './lineOfBusinessTaxonomy';

export const DEFAULT_PAGE_TEMPLATE_SCOPE_KEY = 'global';
export const INSURED_SUBJECTS_PAGE_KEY = 'insured-subjects';

export interface PageTemplateSeedRecord {
  organizationId: number | null;
  scopeKey: string;
  pageKey: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  schemaVersion: number;
  isDefault: boolean;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  parentTemplateId: number | null;
  createdByUserId: number | null;
  publishedAt: Date | null;
  definitionJson: PageTemplateDefinition;
  createdAt: Date;
  updatedAt: Date;
}

function toLabel(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toOptions(values: readonly string[]): PageTemplateOption[] {
  return values.map((value) => ({ label: toLabel(value), value }));
}

function field(definition: PageTemplateFieldDefinition): PageTemplateFieldDefinition {
  return definition;
}

function option(label: string, value: string): PageTemplateOption {
  return { label, value };
}

function yesNoOptions(): PageTemplateOption[] {
  return [option('Yes', 'yes'), option('No', 'no')];
}

function protectionClassOptions(): PageTemplateOption[] {
  return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((value) => option(`Class ${value}`, value));
}

function coverageLayerTypeOptions(): PageTemplateOption[] {
  return [
    option('Primary', 'primary'),
    option('Excess', 'excess'),
    option('Quota Share', 'quota_share'),
    option('Facultative', 'facultative'),
    option('Umbrella', 'umbrella'),
  ];
}

function valuationBasisOptions(): PageTemplateOption[] {
  return [
    option('Replacement Cost', 'replacement_cost'),
    option('Actual Cash Value', 'actual_cash_value'),
    option('Agreed Value', 'agreed_value'),
    option('Declared Value', 'declared_value'),
  ];
}

function transactionTypeOptions(): PageTemplateOption[] {
  return [
    option('New Business', 'new_business'),
    option('Renewal', 'renewal'),
    option('Quote Request', 'quote_request'),
    option('Endorsement', 'endorsement'),
    option('Cancellation', 'cancellation'),
    option('Claim / Loss Notice', 'claim'),
    option('Treaty', 'treaty'),
    option('Facultative', 'facultative'),
  ];
}

function exposureBasisOptions(): PageTemplateOption[] {
  return [
    option('Total Insured Value', 'total_insured_value'),
    option('Annual Revenue / Sales', 'revenue'),
    option('Annual Payroll', 'payroll'),
    option('Headcount / Covered Lives', 'headcount'),
    option('Units / Vehicles / Locations', 'units'),
    option('Mileage / Distance', 'mileage'),
    option('Aggregate Limit', 'aggregate_limit'),
    option('Other', 'other'),
  ];
}

function cloneField<T extends PageTemplateFieldDefinition>(definition: T): T {
  return {
    ...definition,
    options: definition.options?.map((entry) => ({ ...entry })),
    visibleWhen: definition.visibleWhen
      ? {
          lineOfBusinessCodes: definition.visibleWhen.lineOfBusinessCodes ? [...definition.visibleWhen.lineOfBusinessCodes] : undefined,
          lineOfBusinessSubTypeCodes: definition.visibleWhen.lineOfBusinessSubTypeCodes ? [...definition.visibleWhen.lineOfBusinessSubTypeCodes] : undefined,
        }
      : undefined,
    layout: definition.layout ? { ...definition.layout } : undefined,
  };
}

function cloneSectionLayout(layout?: PageTemplateSectionLayoutDefinition): PageTemplateSectionLayoutDefinition | undefined {
  if (!layout) {
    return undefined;
  }

  return {
    ...layout,
    columnWidths: layout.columnWidths ? [...layout.columnWidths] : undefined,
    rowHeights: layout.rowHeights ? [...layout.rowHeights] : undefined,
  };
}

function defaultSectionLayout(fieldCount: number): PageTemplateSectionLayoutDefinition {
  const columns = fieldCount >= 6 ? 3 : fieldCount >= 3 ? 2 : 1;
  const rows = Math.max(2, Math.ceil(fieldCount / columns));

  return {
    type: 'grid',
    columns,
    gap: 12,
    dense: false,
    columnWidths: Array.from({ length: columns }, () => 1),
    rowHeights: Array.from({ length: rows }, () => 120),
  };
}

function applySectionLayouts(sections: PageTemplateDefinition['sections']): PageTemplateDefinition['sections'] {
  return sections.map((section) => ({
    ...section,
    layout: cloneSectionLayout(section.layout) ?? defaultSectionLayout(section.fields.length),
    fields: section.fields.map((field) => cloneField(field)),
  }));
}

function submissionHeaderSection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'submission-header',
    label: 'Submission & Policy',
    order: 5,
    description:
      'Deal-level header shared by every submission: the policy period, transaction type, settlement currency, distribution, and portfolio framing. These attributes describe the deal itself rather than any single insured subject.',
    fields: [
      field({
        key: 'policyInceptionDate',
        label: 'Effective Date',
        type: 'date',
        order: 10,
        required: true,
        canonicalKey: 'policyInceptionDate',
        helperText: 'Inception date of the policy period being quoted or bound.',
      }),
      field({
        key: 'policyExpiryDate',
        label: 'Expiry Date',
        type: 'date',
        order: 20,
        required: true,
        canonicalKey: 'policyExpiryDate',
        helperText: 'Expiry date of the policy period. Together with the effective date this defines the term.',
      }),
      field({
        key: 'transactionType',
        label: 'Deal Type',
        type: 'select',
        order: 30,
        required: true,
        canonicalKey: 'transactionType',
        options: transactionTypeOptions(),
        helperText: 'Transaction type — new business, renewal, endorsement, claim, treaty, facultative …',
      }),
      field({
        key: 'submissionCurrency',
        label: 'Currency',
        type: 'text',
        order: 40,
        canonicalKey: 'currency',
        defaultValue: 'USD',
        placeholder: 'USD',
        helperText: 'ISO 4217 settlement currency for the deal (e.g. USD, EUR, GBP).',
        constraints: { pattern: '^[A-Za-z]{3}$', minLength: 3, maxLength: 3 },
      }),
      field({
        key: 'policyTermMonths',
        label: 'Policy Term (Months)',
        type: 'integer',
        order: 50,
        canonicalKey: 'policyTermMonths',
        placeholder: '12',
        helperText: 'Length of the policy period in months. Optional — derivable from the effective and expiry dates.',
        constraints: { min: 0, max: 600 },
      }),
      field({
        key: 'brokerName',
        label: 'Broker / Intermediary',
        type: 'text',
        order: 60,
        canonicalKey: 'brokerName',
        placeholder: 'Marsh, Aon, Lockton …',
        helperText: 'Producing broker or intermediary, if the submission was placed through one.',
        constraints: { maxLength: 200 },
      }),
      field({
        key: 'underwritingContact',
        label: 'Underwriting Contact',
        type: 'text',
        order: 70,
        canonicalKey: 'underwritingContact',
        placeholder: 'Jane Doe',
        helperText: 'Primary contact responsible for this submission.',
        constraints: { maxLength: 200 },
      }),
      field({
        key: 'isPortfolio',
        label: 'Is Portfolio?',
        type: 'boolean',
        order: 80,
        canonicalKey: 'isPortfolio',
        defaultValue: false,
        helperText: 'Check when this submission represents a portfolio of subjects rather than a single risk.',
      }),
      field({
        key: 'insuredSubjectCount',
        label: 'Number of Insured Subjects',
        type: 'integer',
        order: 90,
        canonicalKey: 'insuredSubjectCount',
        placeholder: '1',
        helperText: 'Total count of individual subjects covered under this policy.',
        constraints: { min: 0 },
      }),
    ],
  };
}

function baseIdentitySection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'subject-identity',
    label: 'Insured & Subject',
    order: 10,
    description: 'Identify the named insured and the specific subject of insurance being scheduled. Every line of business shares this block.',
    fields: [
      field({
        key: 'subjectLabel',
        label: 'Named Insured / Subject',
        type: 'text',
        order: 10,
        required: true,
        canonicalKey: 'subjectLabel',
        placeholder: 'ACME Manufacturing — Plant 1',
        helperText: 'Legal name of the insured or a clear label for the scheduled subject.',
        constraints: { minLength: 1, maxLength: 200 },
      }),
      field({
        key: 'subjectReference',
        label: 'Schedule / Item Reference',
        type: 'text',
        order: 20,
        canonicalKey: 'subjectReference',
        placeholder: 'LOC-001',
        helperText: 'Optional internal reference so the subject can be matched back to the source schedule.',
        constraints: { maxLength: 64 },
      }),
      field({
        key: 'lineOfBusiness',
        label: 'Line of Business',
        type: 'select',
        order: 30,
        required: true,
        canonicalKey: 'lineOfBusiness',
        dataSource: 'lineOfBusiness.primaryTypes',
      }),
      field({
        key: 'lineOfBusinessSubType',
        label: 'Subtype',
        type: 'select',
        order: 40,
        required: true,
        canonicalKey: 'lineOfBusinessSubType',
        dataSource: 'lineOfBusiness.subTypes',
        dependsOn: 'lineOfBusiness',
      }),
      field({
        key: 'riskDescription',
        label: 'Description of Risk / Operations',
        type: 'textarea',
        order: 50,
        canonicalKey: 'riskDescription',
        placeholder: 'Describe the operations, exposure, or activity being insured.',
        helperText: 'Free-text narrative used for triage and underwriting context across every line.',
      }),
    ],
  };
}

function defaultLocationSection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'subject-location',
    label: 'Location & Jurisdiction',
    order: 20,
    description: 'Where the risk sits. Address or territory drives geocoding, catastrophe zone lookup, and jurisdictional rules.',
    fields: [
      field({
        key: 'locationText',
        label: 'Location / Territory',
        type: 'text',
        order: 10,
        canonicalKey: 'locationText',
        placeholder: '123 Main St, Houston, TX',
        helperText: 'Street address for a fixed risk, or the territory / domicile for a mobile or intangible one.',
      }),
      field({
        key: 'countryCode',
        label: 'Country / Jurisdiction',
        type: 'text',
        order: 20,
        canonicalKey: 'countryCode',
        defaultValue: 'US',
        placeholder: 'US',
        helperText: 'ISO 3166-1 alpha-2 country code (e.g. US, GB, DE).',
        constraints: { pattern: '^[A-Za-z]{2}$', minLength: 2, maxLength: 2 },
      }),
      field({
        key: 'latitude',
        label: 'Latitude',
        type: 'number',
        order: 30,
        canonicalKey: 'latitude',
        feedsModeling: true,
        constraints: { min: -90, max: 90, unit: 'degrees' },
      }),
      field({
        key: 'longitude',
        label: 'Longitude',
        type: 'number',
        order: 40,
        canonicalKey: 'longitude',
        feedsModeling: true,
        constraints: { min: -180, max: 180, unit: 'degrees' },
      }),
    ],
  };
}

function defaultExposureSection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'subject-exposure',
    label: 'Exposure & Valuation',
    order: 30,
    description: 'The universal measure of how much is at risk. The exposure basis adapts the same block to property values, revenue, payroll, lives, or units so any line of business can be quantified.',
    fields: [
      field({
        key: 'exposureBasis',
        label: 'Exposure Basis',
        type: 'select',
        order: 10,
        required: true,
        canonicalKey: 'exposureBasis',
        defaultValue: 'total_insured_value',
        options: exposureBasisOptions(),
        helperText: 'How the exposure is measured for this line of business.',
      }),
      field({
        key: 'exposureAmount',
        label: 'Total Insured Value / Exposure Amount',
        type: 'number',
        order: 20,
        required: true,
        canonicalKey: 'replacementCost',
        feedsModeling: true,
        helperText: 'Maximum value at risk on the chosen basis — the primary input to loss modeling.',
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'exposureUnitCount',
        label: 'Exposure Units',
        type: 'integer',
        order: 30,
        canonicalKey: 'exposureUnitCount',
        defaultValue: 1,
        placeholder: '1',
        helperText: 'Count of locations, lives, vehicles, or units represented by this subject.',
        constraints: { min: 0 },
      }),
      field({
        key: 'riskQualityScore',
        label: 'Risk Quality Score',
        type: 'number',
        order: 40,
        canonicalKey: 'vulnerabilityScore',
        defaultValue: 0.5,
        feedsModeling: true,
        helperText: 'Normalized 0–1 score where 0 is best-in-class and 1 is highly vulnerable. Refined by line-specific characteristics.',
        constraints: { min: 0, max: 1 },
      }),
    ],
  };
}

function defaultCoverageSection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'subject-coverage',
    label: 'Coverage Layers',
    order: 50,
    description: 'Define each coverage layer that applies to this subject — attachment, limit, retention, and participation. Add a layer per tower position (primary, excess, …). These terms are universal across lines and feed pricing and capacity checks.',
    repeatable: true,
    collectionKey: 'coverageLayers',
    minItems: 1,
    itemLabel: 'Coverage Layer',
    fields: [
      field({
        key: 'coverageLayerName',
        label: 'Layer Name',
        type: 'text',
        order: 10,
        required: true,
        placeholder: 'Layer A',
        constraints: { maxLength: 120 },
      }),
      field({
        key: 'coverageLayerType',
        label: 'Layer Type',
        type: 'select',
        order: 20,
        required: true,
        canonicalKey: 'coverageLayerType',
        defaultValue: 'primary',
        options: coverageLayerTypeOptions(),
      }),
      field({
        key: 'coverageLayerAttachmentPoint',
        label: 'Attachment Point',
        type: 'number',
        order: 30,
        required: true,
        canonicalKey: 'attachmentPoint',
        feedsModeling: true,
        placeholder: '0',
        helperText: 'Ground-up retention beneath this layer. Use 0 for a primary layer.',
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'coverageLayerLimit',
        label: 'Layer Limit',
        type: 'number',
        order: 40,
        required: true,
        canonicalKey: 'limit',
        feedsModeling: true,
        helperText: 'Maximum amount payable under this layer.',
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'coverageLayerDeductibleSir',
        label: 'Deductible / SIR',
        type: 'number',
        order: 50,
        required: true,
        canonicalKey: 'deductible',
        feedsModeling: true,
        defaultValue: 0,
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'coverageLayerCoinsurancePct',
        label: 'Participation / Coinsurance %',
        type: 'number',
        order: 60,
        required: true,
        canonicalKey: 'coinsurancePct',
        defaultValue: 100,
        helperText: 'Share of the layer written on this submission (0–100%).',
        constraints: { min: 0, max: 100, unit: '%' },
      }),
      field({
        key: 'coverageLayerSublimits',
        label: 'Sublimits',
        type: 'textarea',
        order: 70,
        placeholder: 'Describe any sublimits, carve-outs, or participation limits for this layer',
        helperText: 'Optional — leave blank if no sublimits apply.',
      }),
    ],
  };
}

function statementOfValuesSection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'statement-of-values',
    label: 'Statement of Values',
    order: 60,
    description: 'Itemize the values and quantities for this subject so the exposure can be scheduled consistently. Add a line per scheduled item (building, contents, business interruption, equipment, …).',
    repeatable: true,
    collectionKey: 'statementOfValues',
    minItems: 1,
    itemLabel: 'Value Item',
    fields: [
      field({
        key: 'sovItemDescription',
        label: 'Item Description',
        type: 'text',
        order: 10,
        required: true,
        placeholder: 'Building, contents, vessel, fleet, or other scheduled item',
        constraints: { minLength: 1, maxLength: 200 },
      }),
      field({
        key: 'sovInsuredValue',
        label: 'Insured Value',
        type: 'number',
        order: 20,
        required: true,
        feedsModeling: true,
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'sovQuantity',
        label: 'Quantity',
        type: 'integer',
        order: 30,
        defaultValue: 1,
        placeholder: '1',
        constraints: { min: 1 },
      }),
      field({
        key: 'sovValuationBasis',
        label: 'Valuation Basis',
        type: 'select',
        order: 40,
        required: true,
        defaultValue: 'replacement_cost',
        options: valuationBasisOptions(),
      }),
      field({
        key: 'sovCurrency',
        label: 'Currency',
        type: 'text',
        order: 50,
        defaultValue: 'USD',
        placeholder: 'USD',
        helperText: 'ISO 4217 currency code (e.g. USD, EUR, GBP).',
        constraints: { pattern: '^[A-Za-z]{3}$', minLength: 3, maxLength: 3 },
      }),
      field({
        key: 'sovNotes',
        label: 'SOV Notes',
        type: 'textarea',
        order: 60,
        placeholder: 'Optional schedule notes, valuation assumptions, or exclusions',
      }),
    ],
  };
}

function lossHistorySection(): PageTemplateDefinition['sections'][number] {
  return {
    key: 'loss-history',
    label: 'Loss History',
    order: 70,
    description: 'Prior claims experience. Loss runs are a universal underwriting input across every line of business and a key driver of burning-cost and experience pricing.',
    fields: [
      field({
        key: 'lossHistoryYears',
        label: 'Years of Loss History Provided',
        type: 'integer',
        order: 10,
        canonicalKey: 'lossHistoryYears',
        defaultValue: 5,
        feedsModeling: true,
        helperText: 'Number of policy years represented by the attached loss runs.',
        constraints: { min: 0, max: 100 },
      }),
      field({
        key: 'lossesAsOfDate',
        label: 'Loss Run Valuation Date',
        type: 'date',
        order: 20,
        canonicalKey: 'lossesAsOfDate',
        helperText: 'As-of date the loss figures were valued.',
      }),
      field({
        key: 'claimCount',
        label: 'Number of Claims / Losses',
        type: 'integer',
        order: 30,
        canonicalKey: 'claimCount',
        feedsModeling: true,
        defaultValue: 0,
        constraints: { min: 0 },
      }),
      field({
        key: 'totalIncurredLosses',
        label: 'Total Incurred Losses',
        type: 'number',
        order: 40,
        canonicalKey: 'totalIncurredLosses',
        feedsModeling: true,
        defaultValue: 0,
        helperText: 'Sum of paid plus reserved losses over the history period.',
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'largestLoss',
        label: 'Largest Single Loss',
        type: 'number',
        order: 50,
        canonicalKey: 'largestLoss',
        feedsModeling: true,
        constraints: { min: 0, unit: 'USD' },
      }),
      field({
        key: 'lossNotes',
        label: 'Loss History Notes',
        type: 'textarea',
        order: 60,
        placeholder: 'Notable losses, open claims, remediation, or large-loss commentary',
      }),
    ],
  };
}

function buildPropertyCoverageSection(subTypeLabel: string): PageTemplateDefinition['sections'][number] {
  return {
    key: 'property-coverage',
    label: `${subTypeLabel} Coverage`,
    order: 40,
    description: 'Define the financial terms applied to this insured subject so pricing can be evaluated per coverage.',
    fields: [
      field({
        key: 'buildingCoverageIncluded',
        label: 'Building Coverage',
        type: 'boolean',
        order: 10,
        required: true,
        defaultValue: true,
      }),
      field({
        key: 'buildingCoverageLimit',
        label: 'Building Limit',
        type: 'number',
        order: 20,
        required: true,
        helperText: 'Specify the insured value or limit allocated to the structure.',
      }),
      field({
        key: 'contentsCoverageIncluded',
        label: 'Contents Coverage',
        type: 'boolean',
        order: 30,
        required: true,
        defaultValue: false,
      }),
      field({
        key: 'contentsCoverageLimit',
        label: 'Contents Limit',
        type: 'number',
        order: 40,
        required: true,
      }),
      field({
        key: 'businessInterruptionCoverageIncluded',
        label: 'Business Interruption Coverage',
        type: 'boolean',
        order: 50,
        required: true,
        defaultValue: false,
      }),
      field({
        key: 'businessInterruptionCoverageLimit',
        label: 'Business Interruption Limit',
        type: 'number',
        order: 60,
        required: true,
      }),
      field({
        key: 'businessInterruptionWaitingPeriodHours',
        label: 'Business Interruption Waiting Period (Hours)',
        type: 'integer',
        order: 70,
        required: true,
        defaultValue: 72,
      }),
      field({
        key: 'equipmentBreakdownCoverageIncluded',
        label: 'Equipment Breakdown Coverage',
        type: 'boolean',
        order: 80,
        required: true,
        defaultValue: false,
      }),
      field({
        key: 'equipmentBreakdownCoverageLimit',
        label: 'Equipment Breakdown Limit',
        type: 'number',
        order: 90,
        required: true,
      }),
      field({
        key: 'deductibleSir',
        label: 'Deductible / SIR',
        type: 'number',
        order: 100,
        required: true,
      }),
      field({
        key: 'coinsurancePct',
        label: 'Coinsurance %',
        type: 'number',
        order: 110,
        required: true,
        defaultValue: 100,
      }),
      field({
        key: 'sublimits',
        label: 'Sublimits',
        type: 'textarea',
        order: 120,
        required: true,
        placeholder: 'Describe any flood, named storm, ordinance or law, service interruption, or other sublimits',
      }),
    ],
  };
}

type TemplateFamily =
  | 'property'
  | 'marine'
  | 'aviation'
  | 'liability'
  | 'financial'
  | 'life_health'
  | 'specialty';

function resolveTemplateFamily(primaryCode: string): TemplateFamily {
  if (
    [
      'property',
      'commercial_property',
      'residential_property',
      'catastrophe_property',
      'inland_marine',
      'energy_property',
      'construction_all_risk',
      'builders_risk',
      'equipment_breakdown',
      'farm_ranch',
      'crop',
      'livestock',
      'forestry',
      'public_entity',
      'education',
      'healthcare',
      'hospitality',
    ].includes(primaryCode)
  ) {
    return 'property';
  }

  if (['ocean_marine', 'cargo', 'hull', 'commercial_auto', 'personal_auto', 'travel'].includes(primaryCode)) {
    return 'marine';
  }

  if (primaryCode === 'aviation') {
    return 'aviation';
  }

  if (
    [
      'general_liability',
      'product_liability',
      'excess_liability',
      'umbrella_liability',
      'personal_umbrella',
      'professional_liability',
      'errors_omissions',
      'directors_officers',
      'employment_practices',
      'fiduciary_liability',
      'cyber',
      'data_breach',
      'crime',
      'fidelity',
      'workers_compensation',
      'employers_liability',
      'environmental_liability',
      'terrorism',
      'legal_expenses',
    ].includes(primaryCode)
  ) {
    return 'liability';
  }

  if (
    [
      'trade_credit',
      'surety',
      'political_risk',
      'mortgage_credit',
      'catastrophe_bond',
      'reinsurance_treaty',
      'stop_loss',
      'parametric_weather',
    ].includes(primaryCode)
  ) {
    return 'financial';
  }

  if (
    [
      'life',
      'term_life',
      'whole_life',
      'universal_life',
      'group_life',
      'accident_health',
      'disability_income',
      'pet',
    ].includes(primaryCode)
  ) {
    return 'life_health';
  }

  return 'specialty';
}

function buildPropertySections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'subject-location',
      label: `${primaryLabel} Location`,
      order: 20,
      fields: [
        field({
          key: 'locationText',
          label: 'Risk Address',
          type: 'text',
          order: 10,
          canonicalKey: 'locationText',
          placeholder: '123 Main St, Houston, TX',
        }),
        field({
          key: 'yearBuilt',
          label: 'Year Built',
          type: 'integer',
          order: 20,
          placeholder: '2012',
        }),
        field({
          key: 'squareFootage',
          label: 'Square Footage',
          type: 'integer',
          order: 30,
          placeholder: '125000',
        }),
        cloneField(field({
          key: 'latitude',
          label: 'Latitude',
          type: 'number',
          order: 40,
          canonicalKey: 'latitude',
        })),
        cloneField(field({
          key: 'longitude',
          label: 'Longitude',
          type: 'number',
          order: 50,
          canonicalKey: 'longitude',
        })),
      ],
    },
    {
      key: 'property-characteristics',
      label: `${subTypeLabel} Characteristics`,
      order: 30,
      fields: [
        cloneField(field({
          key: 'assetType',
          label: 'Asset Type',
          type: 'select',
          order: 10,
          required: true,
          canonicalKey: 'assetType',
          defaultValue: 'building',
          options: toOptions(assetTypes),
        })),
        cloneField(field({
          key: 'constructionType',
          label: 'Construction Type',
          type: 'select',
          order: 20,
          canonicalKey: 'constructionType',
          defaultValue: 'masonry',
          options: toOptions(constructionTypes),
        })),
        cloneField(field({
          key: 'occupancyType',
          label: 'Occupancy Type',
          type: 'select',
          order: 30,
          canonicalKey: 'occupancyType',
          defaultValue: primaryLabel.toLowerCase().includes('residential') ? 'residential' : 'commercial',
          options: toOptions(occupancyTypes),
        })),
        field({
          key: 'protectionClass',
          label: 'Protection Class',
          type: 'select',
          order: 40,
          options: protectionClassOptions(),
        }),
        field({
          key: 'sprinklered',
          label: 'Fully Sprinklered',
          type: 'select',
          order: 50,
          options: yesNoOptions(),
        }),
        cloneField(field({
          key: 'replacementCost',
          label: 'Replacement Cost',
          type: 'number',
          order: 60,
          canonicalKey: 'replacementCost',
        })),
        cloneField(field({
          key: 'vulnerabilityScore',
          label: 'Vulnerability Score',
          type: 'number',
          order: 70,
          canonicalKey: 'vulnerabilityScore',
          defaultValue: 0.5,
        })),
      ],
    },
    buildPropertyCoverageSection(subTypeLabel),
  ];
}

function buildMarineSections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'subject-location',
      label: `${primaryLabel} Movement`,
      order: 20,
      fields: [
        field({
          key: 'principalRoute',
          label: 'Principal Route / Territory',
          type: 'text',
          order: 10,
          placeholder: 'US Gulf to Northern Europe',
        }),
        field({
          key: 'homePort',
          label: 'Home Port / Base',
          type: 'text',
          order: 20,
          canonicalKey: 'locationText',
          placeholder: 'Houston, TX',
        }),
        field({
          key: 'annualTransitCount',
          label: 'Annual Transit Count',
          type: 'integer',
          order: 30,
          placeholder: '120',
        }),
      ],
    },
    {
      key: 'marine-risk-details',
      label: `${subTypeLabel} Details`,
      order: 30,
      fields: [
        field({
          key: 'conveyanceType',
          label: 'Conveyance Type',
          type: 'select',
          order: 10,
          options: [option('Owned Asset', 'owned'), option('Chartered / Contracted', 'chartered'), option('Mixed', 'mixed')],
        }),
        field({
          key: 'cargoType',
          label: 'Cargo / Exposure Type',
          type: 'text',
          order: 20,
          placeholder: 'Consumer electronics',
        }),
        field({
          key: 'declaredValue',
          label: 'Declared Value',
          type: 'number',
          order: 30,
          canonicalKey: 'replacementCost',
        }),
        field({
          key: 'securityControls',
          label: 'Security Controls Summary',
          type: 'textarea',
          order: 40,
          placeholder: 'Tracking, escorts, sealed containers, and route monitoring',
        }),
      ],
    },
  ];
}

function buildAviationSections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'aviation-operations',
      label: `${primaryLabel} Operations`,
      order: 20,
      fields: [
        field({
          key: 'baseLocation',
          label: 'Primary Base / Airport',
          type: 'text',
          order: 10,
          canonicalKey: 'locationText',
          placeholder: 'IAH - Houston',
        }),
        field({
          key: 'aircraftModel',
          label: 'Aircraft Model',
          type: 'text',
          order: 20,
          placeholder: 'Boeing 737-800',
        }),
        field({
          key: 'annualFlightHours',
          label: 'Annual Flight Hours',
          type: 'integer',
          order: 30,
          placeholder: '1800',
        }),
      ],
    },
    {
      key: 'aviation-risk-details',
      label: `${subTypeLabel} Underwriting`,
      order: 30,
      fields: [
        field({
          key: 'operatorType',
          label: 'Operator Type',
          type: 'select',
          order: 10,
          options: [option('Commercial', 'commercial'), option('Corporate', 'corporate'), option('Private', 'private'), option('Public Entity', 'public_entity')],
        }),
        field({
          key: 'hullValue',
          label: 'Hull / Exposure Value',
          type: 'number',
          order: 20,
          canonicalKey: 'replacementCost',
        }),
        field({
          key: 'pilotExperienceHours',
          label: 'Minimum Pilot Experience Hours',
          type: 'integer',
          order: 30,
          placeholder: '5000',
        }),
        field({
          key: 'hangared',
          label: 'Stored in Hangar',
          type: 'select',
          order: 40,
          options: yesNoOptions(),
        }),
      ],
    },
  ];
}

function buildLiabilitySections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'insured-profile',
      label: `${primaryLabel} Profile`,
      order: 20,
      fields: [
        field({
          key: 'insuredOperations',
          label: 'Insured Operations',
          type: 'textarea',
          order: 10,
          placeholder: 'Describe the operations, products, or services being insured',
        }),
        field({
          key: 'headquartersLocation',
          label: 'Headquarters / Primary Jurisdiction',
          type: 'text',
          order: 20,
          canonicalKey: 'locationText',
          placeholder: 'New York, NY',
        }),
        field({
          key: 'annualRevenue',
          label: 'Annual Revenue',
          type: 'number',
          order: 30,
        }),
        field({
          key: 'employeeCount',
          label: 'Employee Count',
          type: 'integer',
          order: 40,
        }),
      ],
    },
    {
      key: 'liability-controls',
      label: `${subTypeLabel} Controls`,
      order: 30,
      fields: [
        field({
          key: 'riskControls',
          label: 'Risk Controls',
          type: 'textarea',
          order: 10,
          placeholder: 'Loss control, contractual controls, compliance procedures, or cyber controls',
        }),
        field({
          key: 'claimsHistoryYears',
          label: 'Years of Claims History Available',
          type: 'integer',
          order: 20,
          defaultValue: 5,
        }),
        field({
          key: 'largestLoss',
          label: 'Largest Historical Loss',
          type: 'number',
          order: 30,
        }),
        field({
          key: 'vulnerabilityScore',
          label: 'Risk Control Score',
          type: 'number',
          order: 40,
          canonicalKey: 'vulnerabilityScore',
          defaultValue: 0.5,
        }),
      ],
    },
  ];
}

function buildFinancialSections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'portfolio-profile',
      label: `${primaryLabel} Portfolio`,
      order: 20,
      fields: [
        field({
          key: 'portfolioDescription',
          label: 'Portfolio Description',
          type: 'textarea',
          order: 10,
          placeholder: 'Describe the portfolio, counterparties, or treaty structure',
        }),
        field({
          key: 'domicile',
          label: 'Primary Domicile / Jurisdiction',
          type: 'text',
          order: 20,
          canonicalKey: 'locationText',
        }),
        field({
          key: 'counterpartyCount',
          label: 'Counterparty / Cedant Count',
          type: 'integer',
          order: 30,
        }),
      ],
    },
    {
      key: 'financial-risk-details',
      label: `${subTypeLabel} Metrics`,
      order: 30,
      fields: [
        field({
          key: 'averageTenorDays',
          label: 'Average Tenor (Days)',
          type: 'integer',
          order: 10,
        }),
        field({
          key: 'maxExposure',
          label: 'Maximum Single Exposure',
          type: 'number',
          order: 20,
          canonicalKey: 'replacementCost',
        }),
        field({
          key: 'attachmentBasis',
          label: 'Attachment Basis',
          type: 'select',
          order: 30,
          options: [option('Per Risk', 'per_risk'), option('Aggregate', 'aggregate'), option('Portfolio', 'portfolio'), option('Parametric', 'parametric')],
        }),
        field({
          key: 'historicalDefaultRate',
          label: 'Historical Default / Loss Ratio',
          type: 'number',
          order: 40,
        }),
      ],
    },
  ];
}

function buildLifeHealthSections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    {
      key: 'covered-population',
      label: `${primaryLabel} Population`,
      order: 20,
      fields: [
        field({
          key: 'coveredLives',
          label: 'Covered Lives / Policies',
          type: 'integer',
          order: 10,
        }),
        field({
          key: 'averageAge',
          label: 'Average Age',
          type: 'integer',
          order: 20,
        }),
        field({
          key: 'distributionRegion',
          label: 'Distribution Region',
          type: 'text',
          order: 30,
          canonicalKey: 'locationText',
        }),
      ],
    },
    {
      key: 'benefit-structure',
      label: `${subTypeLabel} Benefits`,
      order: 30,
      fields: [
        field({
          key: 'benefitStructure',
          label: 'Benefit Structure',
          type: 'select',
          order: 10,
          options: [option('Guaranteed Benefit', 'guaranteed'), option('Indemnity', 'indemnity'), option('Expense Reimbursement', 'expense_reimbursement'), option('Variable Benefit', 'variable')],
        }),
        field({
          key: 'sumAssured',
          label: 'Sum Assured / Maximum Benefit',
          type: 'number',
          order: 20,
          canonicalKey: 'replacementCost',
        }),
        field({
          key: 'waitingPeriodDays',
          label: 'Waiting Period (Days)',
          type: 'integer',
          order: 30,
        }),
        field({
          key: 'underwritingApproach',
          label: 'Underwriting Approach',
          type: 'select',
          order: 40,
          options: [option('Simplified Issue', 'simplified_issue'), option('Guaranteed Issue', 'guaranteed_issue'), option('Fully Underwritten', 'fully_underwritten')],
        }),
      ],
    },
  ];
}

function buildSpecialtySections(primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  return [
    defaultLocationSection(),
    {
      key: 'specialty-risk-details',
      label: `${subTypeLabel} Details`,
      order: 30,
      fields: [
        field({
          key: 'exposureDescription',
          label: 'Exposure Description',
          type: 'textarea',
          order: 10,
          placeholder: `Describe the ${subTypeLabel.toLowerCase()} exposure`,
        }),
        field({
          key: 'limitBasis',
          label: 'Limit Basis',
          type: 'select',
          order: 20,
          options: [option('Per Occurrence', 'per_occurrence'), option('Aggregate', 'aggregate'), option('Per Asset', 'per_asset')],
        }),
        cloneField(field({
          key: 'replacementCost',
          label: 'Exposure Value',
          type: 'number',
          order: 30,
          canonicalKey: 'replacementCost',
        })),
        cloneField(field({
          key: 'vulnerabilityScore',
          label: 'Exposure Complexity Score',
          type: 'number',
          order: 40,
          canonicalKey: 'vulnerabilityScore',
          defaultValue: 0.5,
        })),
      ],
    },
  ];
}

function buildVariationSections(primaryCode: string, primaryLabel: string, subTypeLabel: string): PageTemplateDefinition['sections'] {
  const sections = (() => {
  switch (resolveTemplateFamily(primaryCode)) {
    case 'property':
      return buildPropertySections(primaryLabel, subTypeLabel);
    case 'marine':
      return buildMarineSections(primaryLabel, subTypeLabel);
    case 'aviation':
      return buildAviationSections(primaryLabel, subTypeLabel);
    case 'liability':
      return buildLiabilitySections(primaryLabel, subTypeLabel);
    case 'financial':
      return buildFinancialSections(primaryLabel, subTypeLabel);
    case 'life_health':
      return buildLifeHealthSections(primaryLabel, subTypeLabel);
    case 'specialty':
    default:
      return buildSpecialtySections(primaryLabel, subTypeLabel);
  }
  })();

  return [...sections, defaultCoverageSection(), statementOfValuesSection()];
}

function buildInsuredSubjectsPageVariation(params: {
  lineOfBusinessCode: string;
  lineOfBusinessLabel: string;
  lineOfBusinessSubTypeCode?: string;
  lineOfBusinessSubTypeLabel?: string;
}): PageTemplateDefinition {
  const hasSubType = Boolean(params.lineOfBusinessSubTypeCode && params.lineOfBusinessSubTypeLabel);
  const subTypeLabel = hasSubType ? params.lineOfBusinessSubTypeLabel! : params.lineOfBusinessLabel;

  return {
    schemaVersion: 1,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    title: hasSubType ? `${params.lineOfBusinessLabel}: ${subTypeLabel}` : params.lineOfBusinessLabel,
    description: hasSubType
      ? `Template variation for ${params.lineOfBusinessLabel} / ${subTypeLabel} insured subject capture.`
      : `Template variation for ${params.lineOfBusinessLabel} insured subject capture.`,
    sections: applySectionLayouts([
      submissionHeaderSection(),
      baseIdentitySection(),
      ...buildVariationSections(params.lineOfBusinessCode, params.lineOfBusinessLabel, subTypeLabel),
    ]),
  };
}

export function buildDefaultInsuredSubjectsPageDefinition(): PageTemplateDefinition {
  return {
    schemaVersion: 1,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    title: 'Insured Subjects',
    description:
      'Line-agnostic default capturing what every submission requires: the insured and subject, its location and jurisdiction, the exposure and valuation, coverage-layer terms, a statement of values, and prior loss history. Line-of-business variations refine these sections without removing them.',
    sections: applySectionLayouts([
      submissionHeaderSection(),
      baseIdentitySection(),
      defaultLocationSection(),
      defaultExposureSection(),
      defaultCoverageSection(),
      statementOfValuesSection(),
      lossHistorySection(),
    ]),
  };
}

export function buildDefaultPageTemplateSeeds(now = new Date()): PageTemplateSeedRecord[] {
  const baseSeed = {
    organizationId: null,
    scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
    pageKey: INSURED_SUBJECTS_PAGE_KEY,
    version: 1,
    status: 'published' as const,
    schemaVersion: 1,
    parentTemplateId: null,
    createdByUserId: null,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const seeds: PageTemplateSeedRecord[] = [
    {
      ...baseSeed,
      isDefault: true,
      lineOfBusinessCode: '',
      lineOfBusinessSubTypeCode: '',
      definitionJson: buildDefaultInsuredSubjectsPageDefinition(),
    },
  ];

  for (const primary of lineOfBusinessTaxonomy) {
    seeds.push({
      ...baseSeed,
      isDefault: false,
      lineOfBusinessCode: primary.code,
      lineOfBusinessSubTypeCode: '',
      definitionJson: buildInsuredSubjectsPageVariation({
        lineOfBusinessCode: primary.code,
        lineOfBusinessLabel: primary.label,
      }),
    });

    for (const subType of primary.subTypes) {
      seeds.push({
        ...baseSeed,
        isDefault: false,
        lineOfBusinessCode: primary.code,
        lineOfBusinessSubTypeCode: subType.code,
        definitionJson: buildInsuredSubjectsPageVariation({
          lineOfBusinessCode: primary.code,
          lineOfBusinessLabel: primary.label,
          lineOfBusinessSubTypeCode: subType.code,
          lineOfBusinessSubTypeLabel: subType.label,
        }),
      });
    }
  }

  return seeds;
}