import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SubjectTemplateFields from './SubjectTemplateFields';
import type { SubjectInput } from '../InsurerDashboard.sectionTypes';

const meta: Meta<typeof SubjectTemplateFields> = {
  title: 'Pages/Insurer Dashboard/Sections/Subject Template Fields',
  component: SubjectTemplateFields,
};

export default meta;

type Story = StoryObj<typeof meta>;

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
    taxonomy: [],
    onFieldValueChange: () => {},
    onTemplateResolved: () => {},
  },
};

export const NoLineOfBusiness: Story = {
  args: {
    subject: {
      ...subject,
      lineOfBusiness: '',
      lineOfBusinessSubType: '',
    },
    subjectIndex: 0,
    organizationId: null,
    taxonomy: [],
    onFieldValueChange: () => {},
    onTemplateResolved: () => {},
  },
};
