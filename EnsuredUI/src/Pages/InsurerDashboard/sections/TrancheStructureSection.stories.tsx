import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TrancheStructureSection from './TrancheStructureSection';
import type { SubjectGroup, SubjectInput, TrancheInput } from '../InsurerDashboard.sectionTypes';

const meta: Meta<typeof TrancheStructureSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Tranche Structure',
  component: TrancheStructureSection,
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
];

const groupedSubjects: SubjectGroup[] = [
  {
    key: 'houston-1',
    label: 'Houston, TX',
    subjects: [{ subject: subjects[0], index: 0 }],
  },
  {
    key: 'miami-1',
    label: 'Miami, FL',
    subjects: [{ subject: subjects[1], index: 1 }],
  },
];

const tranches: TrancheInput[] = [
  {
    trancheId: 'tranche-1',
    name: 'Senior Capital',
    layerMin: '500000000',
    layerMax: '1200000000',
    returnRate: '0',
    riskLevel: 'low',
    capitalRequired: '700000000',
    subjectSelectionMode: 'all',
    selectedSubjectIds: [],
  },
  {
    trancheId: 'tranche-2',
    name: 'Mezzanine',
    layerMin: '250000000',
    layerMax: '500000000',
    returnRate: '0',
    riskLevel: 'medium',
    capitalRequired: '250000000',
    subjectSelectionMode: 'selective',
    selectedSubjectIds: ['subject-1'],
  },
];

export const Default: Story = {
  args: {
    isActive: true,
    tranches,
    subjects,
    groupedSubjects,
    subjectGroupingMode: 'location',
    onAddTranche: () => {},
    onUpdateTrancheSubjectSelectionMode: () => {},
    onUpdateTranche: () => {},
    onUpdateTrancheSubjectSelection: () => {},
  },
};
