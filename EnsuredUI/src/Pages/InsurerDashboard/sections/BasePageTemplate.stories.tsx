import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import DynamicFormSection from './DynamicFormSection';
import type { SuggestedFormSection } from '../../../api/pipeline';

/**
 * Fixture mirroring the API's `buildDefaultInsuredSubjectsPageDefinition()` — the
 * universal, line-agnostic base Page Template that every submission form schema
 * derives from. It captures what *all* submissions require: the insured & subject,
 * its location/jurisdiction, the exposure & valuation, repeatable coverage layers
 * (a tower), a repeatable statement of values (a schedule), and prior loss history.
 *
 * Kept inline (the established story pattern) so the story renders without an API
 * round-trip; the canonical source of truth lives in
 * EnsuredAPI/src/db/seed-data/pageTemplates.ts.
 */
const BASE_TEMPLATE_SECTIONS: SuggestedFormSection[] = [
  {
    key: 'subject-identity',
    label: 'Insured & Subject',
    order: 10,
    origin: 'base',
    description:
      'Identify the named insured and the specific subject of insurance being scheduled. Every line of business shares this block.',
    fields: [
      {
        key: 'subjectLabel',
        label: 'Named Insured / Subject',
        type: 'text',
        order: 10,
        required: true,
        origin: 'base',
        placeholder: 'ACME Manufacturing — Plant 1',
        helperText: 'Legal name of the insured or a clear label for the scheduled subject.',
      },
      {
        key: 'subjectReference',
        label: 'Schedule / Item Reference',
        type: 'text',
        order: 20,
        origin: 'base',
        placeholder: 'LOC-001',
        helperText: 'Optional internal reference so the subject can be matched back to the source schedule.',
      },
      {
        key: 'lineOfBusiness',
        label: 'Line of Business',
        type: 'select',
        order: 30,
        required: true,
        origin: 'base',
        helperText: 'Populated from the platform line-of-business taxonomy at runtime.',
        options: [
          { value: 'property', label: 'Property' },
          { value: 'general_liability', label: 'General Liability' },
          { value: 'ocean_marine', label: 'Ocean Marine' },
          { value: 'aviation', label: 'Aviation' },
          { value: 'cyber', label: 'Cyber' },
        ],
      },
      {
        key: 'lineOfBusinessSubType',
        label: 'Subtype',
        type: 'select',
        order: 40,
        required: true,
        origin: 'base',
        options: [
          { value: 'commercial_property', label: 'Commercial Property' },
          { value: 'residential_property', label: 'Residential Property' },
          { value: 'catastrophe_property', label: 'Catastrophe Property' },
        ],
      },
      {
        key: 'riskDescription',
        label: 'Description of Risk / Operations',
        type: 'textarea',
        order: 50,
        origin: 'base',
        placeholder: 'Describe the operations, exposure, or activity being insured.',
        helperText: 'Free-text narrative used for triage and underwriting context across every line.',
      },
    ],
  },
  {
    key: 'subject-location',
    label: 'Location & Jurisdiction',
    order: 20,
    origin: 'base',
    description:
      'Where the risk sits. Address or territory drives geocoding, catastrophe zone lookup, and jurisdictional rules.',
    fields: [
      {
        key: 'locationText',
        label: 'Location / Territory',
        type: 'text',
        order: 10,
        origin: 'base',
        placeholder: '123 Main St, Houston, TX',
        helperText: 'Street address for a fixed risk, or the territory / domicile for a mobile or intangible one.',
      },
      {
        key: 'countryCode',
        label: 'Country / Jurisdiction',
        type: 'text',
        order: 20,
        origin: 'base',
        defaultValue: 'US',
        placeholder: 'US',
        helperText: 'ISO 3166-1 alpha-2 country code (e.g. US, GB, DE).',
      },
      { key: 'latitude', label: 'Latitude', type: 'number', order: 30, origin: 'base' },
      { key: 'longitude', label: 'Longitude', type: 'number', order: 40, origin: 'base' },
    ],
  },
  {
    key: 'subject-exposure',
    label: 'Exposure & Valuation',
    order: 30,
    origin: 'base',
    description:
      'The universal measure of how much is at risk. The exposure basis adapts the same block to property values, revenue, payroll, lives, or units so any line of business can be quantified.',
    fields: [
      {
        key: 'exposureBasis',
        label: 'Exposure Basis',
        type: 'select',
        order: 10,
        required: true,
        origin: 'base',
        defaultValue: 'total_insured_value',
        helperText: 'How the exposure is measured for this line of business.',
        options: [
          { value: 'total_insured_value', label: 'Total Insured Value' },
          { value: 'revenue', label: 'Annual Revenue / Sales' },
          { value: 'payroll', label: 'Annual Payroll' },
          { value: 'headcount', label: 'Headcount / Covered Lives' },
          { value: 'units', label: 'Units / Vehicles / Locations' },
          { value: 'mileage', label: 'Mileage / Distance' },
          { value: 'aggregate_limit', label: 'Aggregate Limit' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'exposureAmount',
        label: 'Total Insured Value / Exposure Amount',
        type: 'number',
        order: 20,
        required: true,
        origin: 'base',
        helperText: 'Maximum value at risk on the chosen basis — the primary input to loss modeling.',
      },
      {
        key: 'exposureUnitCount',
        label: 'Exposure Units',
        type: 'integer',
        order: 30,
        origin: 'base',
        defaultValue: 1,
        helperText: 'Count of locations, lives, vehicles, or units represented by this subject.',
      },
      {
        key: 'riskQualityScore',
        label: 'Risk Quality Score',
        type: 'number',
        order: 40,
        origin: 'base',
        defaultValue: 0.5,
        helperText: 'Normalized 0–1 score where 0 is best-in-class and 1 is highly vulnerable.',
      },
    ],
  },
  {
    key: 'subject-coverage',
    label: 'Coverage Layers',
    order: 50,
    origin: 'base',
    repeatable: true,
    description:
      'Define each coverage layer that applies to this subject — attachment, limit, retention, and participation. Add a layer per tower position (primary, excess, …).',
    fields: [
      { key: 'coverageLayerName', label: 'Layer Name', type: 'text', order: 10, required: true, origin: 'base', placeholder: 'Layer A' },
      {
        key: 'coverageLayerType',
        label: 'Layer Type',
        type: 'select',
        order: 20,
        required: true,
        origin: 'base',
        defaultValue: 'primary',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'excess', label: 'Excess' },
          { value: 'quota_share', label: 'Quota Share' },
          { value: 'facultative', label: 'Facultative' },
          { value: 'umbrella', label: 'Umbrella' },
        ],
      },
      {
        key: 'coverageLayerAttachmentPoint',
        label: 'Attachment Point',
        type: 'number',
        order: 30,
        required: true,
        origin: 'base',
        placeholder: '0',
        helperText: 'Ground-up retention beneath this layer. Use 0 for a primary layer.',
      },
      { key: 'coverageLayerLimit', label: 'Layer Limit', type: 'number', order: 40, required: true, origin: 'base' },
      { key: 'coverageLayerDeductibleSir', label: 'Deductible / SIR', type: 'number', order: 50, required: true, origin: 'base', defaultValue: 0 },
      {
        key: 'coverageLayerCoinsurancePct',
        label: 'Participation / Coinsurance %',
        type: 'number',
        order: 60,
        required: true,
        origin: 'base',
        defaultValue: 100,
        helperText: 'Share of the layer written on this submission (0–100%).',
      },
      {
        key: 'coverageLayerSublimits',
        label: 'Sublimits',
        type: 'textarea',
        order: 70,
        origin: 'base',
        placeholder: 'Describe any sublimits, carve-outs, or participation limits for this layer',
        helperText: 'Optional — leave blank if no sublimits apply.',
      },
    ],
  },
  {
    key: 'statement-of-values',
    label: 'Statement of Values',
    order: 60,
    origin: 'base',
    repeatable: true,
    description:
      'Itemize the values and quantities for this subject so the exposure can be scheduled consistently. Add a line per scheduled item (building, contents, business interruption, equipment, …).',
    fields: [
      { key: 'sovItemDescription', label: 'Item Description', type: 'text', order: 10, required: true, origin: 'base', placeholder: 'Building, contents, vessel, fleet, or other scheduled item' },
      { key: 'sovInsuredValue', label: 'Insured Value', type: 'number', order: 20, required: true, origin: 'base' },
      { key: 'sovQuantity', label: 'Quantity', type: 'integer', order: 30, origin: 'base', defaultValue: 1 },
      {
        key: 'sovValuationBasis',
        label: 'Valuation Basis',
        type: 'select',
        order: 40,
        required: true,
        origin: 'base',
        defaultValue: 'replacement_cost',
        options: [
          { value: 'replacement_cost', label: 'Replacement Cost' },
          { value: 'actual_cash_value', label: 'Actual Cash Value' },
          { value: 'agreed_value', label: 'Agreed Value' },
          { value: 'declared_value', label: 'Declared Value' },
        ],
      },
      { key: 'sovCurrency', label: 'Currency', type: 'text', order: 50, origin: 'base', defaultValue: 'USD', placeholder: 'USD', helperText: 'ISO 4217 currency code (e.g. USD, EUR, GBP).' },
      { key: 'sovNotes', label: 'SOV Notes', type: 'textarea', order: 60, origin: 'base', placeholder: 'Optional schedule notes, valuation assumptions, or exclusions' },
    ],
  },
  {
    key: 'loss-history',
    label: 'Loss History',
    order: 70,
    origin: 'base',
    description:
      'Prior claims experience. Loss runs are a universal underwriting input across every line of business and a key driver of burning-cost and experience pricing.',
    fields: [
      { key: 'lossHistoryYears', label: 'Years of Loss History Provided', type: 'integer', order: 10, origin: 'base', defaultValue: 5, helperText: 'Number of policy years represented by the attached loss runs.' },
      { key: 'lossesAsOfDate', label: 'Loss Run Valuation Date', type: 'date', order: 20, origin: 'base', helperText: 'As-of date the loss figures were valued.' },
      { key: 'claimCount', label: 'Number of Claims / Losses', type: 'integer', order: 30, origin: 'base', defaultValue: 0 },
      { key: 'totalIncurredLosses', label: 'Total Incurred Losses', type: 'number', order: 40, origin: 'base', defaultValue: 0, helperText: 'Sum of paid plus reserved losses over the history period.' },
      { key: 'largestLoss', label: 'Largest Single Loss', type: 'number', order: 50, origin: 'base' },
      { key: 'lossNotes', label: 'Loss History Notes', type: 'textarea', order: 60, origin: 'base', placeholder: 'Notable losses, open claims, remediation, or large-loss commentary' },
    ],
  },
];

/** Compose the full base template by stacking one DynamicFormSection per section. */
function BasePageTemplate({ sections }: { sections: SuggestedFormSection[] }) {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 960 }}>
      {sections.map((section) => (
        <DynamicFormSection
          key={section.key}
          isActive
          label={section.label}
          description={section.description}
          fields={section.fields}
          repeatable={section.repeatable}
        />
      ))}
    </div>
  );
}

const meta: Meta<typeof DynamicFormSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Base Page Template',
  component: DynamicFormSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The universal default Page Template that every submission form schema derives from. Coverage Layers and Statement of Values are repeatable schedules; the remaining sections capture the single insured subject.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The full base template, rendered section by section. */
export const InsuredSubjectsBaseTemplate: Story = {
  name: 'Insured Subjects — Base Template',
  render: () => <BasePageTemplate sections={BASE_TEMPLATE_SECTIONS} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // All six base sections render.
    await expect(canvas.getByText('Insured & Subject')).toBeInTheDocument();
    await expect(canvas.getByText('Location & Jurisdiction')).toBeInTheDocument();
    await expect(canvas.getByText('Exposure & Valuation')).toBeInTheDocument();
    await expect(canvas.getByText('Coverage Layers')).toBeInTheDocument();
    await expect(canvas.getByText('Statement of Values')).toBeInTheDocument();
    await expect(canvas.getByText('Loss History')).toBeInTheDocument();

    // Required fields are marked, and seeded defaults render.
    await expect(canvas.getByText(/Named Insured \/ Subject/)).toBeInTheDocument();
    await expect(canvas.getByDisplayValue('US')).toBeInTheDocument(); // countryCode default
    await expect(canvas.getByDisplayValue('0.5')).toBeInTheDocument(); // riskQualityScore default

    // Repeatable schedules start with one card and grow on "Add".
    await expect(canvas.getByText('Coverage Layer 1')).toBeInTheDocument();
    await expect(canvas.queryByText('Coverage Layer 2')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '+ Add Coverage Layer' }));
    await expect(canvas.getByText('Coverage Layer 2')).toBeInTheDocument();
  },
};
