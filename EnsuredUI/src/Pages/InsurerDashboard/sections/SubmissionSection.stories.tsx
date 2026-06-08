import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SubmissionSection from './SubmissionSection';

const meta: Meta<typeof SubmissionSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Submission',
  component: SubmissionSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    liveExposureDisplay: '$950,000,000',
    premiumDisplay: '$12,000,000',
    subjectCount: 3,
    trancheCount: 2,
    loading: false,
    message: null,
    onSubmit: () => {},
  },
};
