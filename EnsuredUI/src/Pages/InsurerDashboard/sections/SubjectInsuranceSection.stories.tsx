import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SubjectInsuranceSection from './SubjectInsuranceSection';
import type { SubjectGroup, SubjectInput } from '../InsurerDashboard.sectionTypes';
import type { LineOfBusinessTaxonomyPrimary } from '../lineOfBusinessTaxonomy';

const meta: Meta<typeof SubjectInsuranceSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Subject Insurance',
  component: SubjectInsuranceSection,
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

const subjects: SubjectInput[] = [
  {
    subjectId: 'subject-1',
    subjectLabel: 'Houston Portfolio',
    lineOfBusiness: 'Property',
    lineOfBusinessSubType: 'All Risk',
    fieldValues: {},
  },
  {
    subjectId: 'subject-2',
    subjectLabel: 'Miami Industrial',
    lineOfBusiness: 'Property',
    lineOfBusinessSubType: 'Catastrophe',
    fieldValues: {},
  },
];

const groupedSubjectsLocation: SubjectGroup[] = [
  {
    key: 'houston-tx',
    label: 'Houston, TX',
    subjects: [{ subject: subjects[0], index: 0 }],
  },
  {
    key: 'miami-fl',
    label: 'Miami, FL',
    subjects: [{ subject: subjects[1], index: 1 }],
  },
];

const groupedSubjectsSeparate: SubjectGroup[] = [
  {
    key: 'all',
    label: 'All Subjects',
    subjects: [
      { subject: subjects[0], index: 0 },
      { subject: subjects[1], index: 1 },
    ],
  },
];

const baseArgs = {
  isActive: true,
  organizationId: null,
  taxonomyByPrimaryLabel,
  lineOfBusinessTaxonomy: taxonomy,
  onSetLocationGrouping: () => {},
  onSetSeparateGrouping: () => {},
  onAddSubject: () => {},
  onRemoveSubject: () => {},
  onUpdateSubject: () => {},
  onUpdateSubjectPrimaryLineOfBusiness: () => {},
  onUpdateSubjectLineOfBusinessSubType: () => {},
  onFieldValueChange: () => {},
  onTemplateResolved: () => {},
};

export const GroupedByLocation: Story = {
  args: {
    ...baseArgs,
    subjectGroupingMode: 'location',
    groupedSubjects: groupedSubjectsLocation,
  },
};

export const Separate: Story = {
  args: {
    ...baseArgs,
    subjectGroupingMode: 'separate',
    groupedSubjects: groupedSubjectsSeparate,
  },
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    subjectGroupingMode: 'location',
    groupedSubjects: [],
  },
};
