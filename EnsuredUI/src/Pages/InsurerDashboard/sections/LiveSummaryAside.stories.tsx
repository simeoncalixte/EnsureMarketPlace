import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import LiveSummaryAside from './LiveSummaryAside';
import type { SubjectInput } from '../InsurerDashboard.sectionTypes';

const meta: Meta<typeof LiveSummaryAside> = {
  title: 'Pages/Insurer Dashboard/Sections/Live Summary Aside',
  component: LiveSummaryAside,
};

export default meta;

type Story = StoryObj<typeof meta>;

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
  {
    subjectId: 'subject-3',
    subjectLabel: 'Dallas Campus',
    lineOfBusiness: 'Property',
    lineOfBusinessSubType: 'All Risk',
    fieldValues: {},
  },
];

export const Default: Story = {
  args: {
    exposureLoading: false,
    exposureDisplay: '$1,240,000,000',
    subjects,
    workflowChecks: [
      { label: 'Validation', value: 'Complete', color: '#4edea3' },
      { label: 'Submission', value: 'Open', color: '#4b8eff' },
      { label: 'Signing', value: 'Pending', color: '#c1c6d7' },
    ],
  },
};
