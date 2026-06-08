import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SubjectInsuranceCard from './SubjectInsuranceCard';
import type { SubjectInput } from '../InsurerDashboard.sectionTypes';
import type { LineOfBusinessTaxonomyPrimary } from '../lineOfBusinessTaxonomy';

const meta: Meta<typeof SubjectInsuranceCard> = {
  title: 'Pages/Insurer Dashboard/Sections/Subject Insurance Card',
  component: SubjectInsuranceCard,
};

export default meta;

type Story = StoryObj<typeof meta>;

const taxonomy: LineOfBusinessTaxonomyPrimary[] = [
  {
    code: 'PROP',
    label: 'Property',
    subTypes: [
      { code: 'PROP_AR', label: 'All Risk' },
      { code: 'PROP_CAT', label: 'Catastrophe' },
    ],
  },
  {
    code: 'LIAB',
    label: 'Liability',
    subTypes: [
      { code: 'LIAB_GL', label: 'General Liability' },
    ],
  },
];

const taxonomyByPrimaryLabel = new Map<string, LineOfBusinessTaxonomyPrimary>(
  taxonomy.map((t) => [t.label, t]),
);

const subject: SubjectInput = {
  subjectId: 'subject-1',
  subjectLabel: 'Houston Portfolio',
  lineOfBusiness: 'Property',
  lineOfBusinessSubType: 'All Risk',
  fieldValues: {},
};

export const Default: Story = {
  args: {
    subject,
    subjectIndex: 0,
    organizationId: null,
    isCollapsed: false,
    onToggleCollapsed: () => {},
    taxonomyByPrimaryLabel,
    lineOfBusinessTaxonomy: taxonomy,
    onRemoveSubject: () => {},
    onUpdateSubject: () => {},
    onUpdateSubjectPrimaryLineOfBusiness: () => {},
    onUpdateSubjectLineOfBusinessSubType: () => {},
    onFieldValueChange: () => {},
    onTemplateResolved: () => {},
  },
};

export const Collapsed: Story = {
  args: {
    ...Default.args,
    isCollapsed: true,
  },
};

export const NoLineOfBusiness: Story = {
  args: {
    ...Default.args,
    subject: {
      ...subject,
      lineOfBusiness: '',
      lineOfBusinessSubType: '',
    },
  },
};
