import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import DynamicFormSection from './DynamicFormSection';
import type { SuggestedFormField } from '../../../api/pipeline';

// AI fields the pipeline injects into a base tab (e.g. Financials), prefilled
// from the submission.
const EXTENSION_FIELDS: SuggestedFormField[] = [
  { key: 'reinstatementPremium', label: 'Reinstatement Premium', type: 'currency', order: 1, origin: 'ai', value: 250000 },
  {
    key: 'constructionType',
    label: 'Construction Type',
    type: 'select',
    order: 2,
    origin: 'ai',
    value: 'steel',
    options: [
      { value: 'steel', label: 'Steel' },
      { value: 'wood', label: 'Wood' },
    ],
  },
];

// A wholly-new AI section the pipeline surfaced for a parametric cover.
const PARAMETRIC_FIELDS: SuggestedFormField[] = [
  { key: 'indexSource', label: 'Index / Oracle Source', type: 'text', order: 1, origin: 'ai', value: 'NOAA' },
  {
    key: 'triggerMetric',
    label: 'Trigger Metric',
    type: 'select',
    order: 2,
    origin: 'ai',
    options: [
      { value: 'wind_speed', label: 'Wind Speed' },
      { value: 'rainfall', label: 'Rainfall' },
    ],
  },
  { key: 'payoutTrigger', label: 'Payout Trigger Value', type: 'currency', order: 3, origin: 'ai' },
];

const SUBJECT_FIELDS: SuggestedFormField[] = [
  { key: 'subjectLabel', label: 'Subject Label', type: 'text', order: 1, required: true, origin: 'ai' },
  { key: 'location', label: 'Location / Address', type: 'text', order: 2, origin: 'ai' },
  { key: 'insuredValue', label: 'Insured Value (TIV)', type: 'currency', order: 3, origin: 'ai' },
];

const meta: Meta<typeof DynamicFormSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Dynamic Form Section',
  component: DynamicFormSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** AI-extension fields injected inline into a base tab — prefilled, no panel chrome. */
export const InlineExtensions: Story = {
  args: {
    isActive: true,
    label: 'AI-suggested fields',
    fields: EXTENSION_FIELDS,
    badge: 'ai',
    inline: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('AI-suggested fields')).toBeInTheDocument();
    await expect(canvas.getByText('AI')).toBeInTheDocument();
    // The currency field is prefilled from the submission.
    await expect(canvas.getByDisplayValue('250000')).toBeInTheDocument();
  },
};

/** An inactive inline block renders nothing (it lives inside a non-active tab). */
export const InlineInactive: Story = {
  args: {
    isActive: false,
    label: 'AI-suggested fields',
    fields: EXTENSION_FIELDS,
    badge: 'ai',
    inline: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('AI-suggested fields')).toBeNull();
  },
};

/** A wholly-new AI section, rendered as its own tab panel with a header + badge. */
export const NewSection: Story = {
  args: {
    isActive: true,
    label: 'Parametric Trigger',
    description: 'Index and settlement parameters specific to this parametric cover.',
    fields: PARAMETRIC_FIELDS,
    badge: 'ai',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Parametric Trigger')).toBeInTheDocument();
    await expect(canvas.getByText('AI section')).toBeInTheDocument();
    await expect(canvas.getByDisplayValue('NOAA')).toBeInTheDocument();
  },
};

/** A repeatable AI section renders an add/remove card list. */
export const RepeatableSection: Story = {
  args: {
    isActive: true,
    label: 'Insured Subjects',
    description: 'Additional insured objects the AI surfaced for this submission.',
    fields: SUBJECT_FIELDS,
    repeatable: true,
    badge: 'ai',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Starts with one card.
    await expect(canvas.getByText('Insured Subject 1')).toBeInTheDocument();
    await expect(canvas.queryByText('Insured Subject 2')).toBeNull();

    // "+ Add" appends a second card...
    await userEvent.click(canvas.getByRole('button', { name: '+ Add Insured Subject' }));
    await expect(canvas.getByText('Insured Subject 2')).toBeInTheDocument();

    // ...and "Remove" drops back to one.
    await userEvent.click(canvas.getAllByRole('button', { name: 'Remove' })[1]);
    await expect(canvas.queryByText('Insured Subject 2')).toBeNull();
  },
};
