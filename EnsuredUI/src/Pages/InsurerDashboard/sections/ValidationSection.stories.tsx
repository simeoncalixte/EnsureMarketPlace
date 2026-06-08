import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ValidationSection from './ValidationSection';

const meta: Meta<typeof ValidationSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Validation',
  component: ValidationSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    exposureLoading: false,
    liveExposureDisplay: '$950,000,000',
    sourceLabel: 'Seeded from TRX-9902',
    subjectCount: 3,
    trancheCount: 2,
    sourceTypeLabel: 'Property',
    subjectPreview: 'Houston Portfolio • Miami Industrial',
    checks: [
      { label: 'Subject structure', value: '3 subjects mapped' },
      { label: 'Tranche ladder', value: '2 layers ready' },
      { label: 'Live exposure', value: '$950,000,000' },
      { label: 'Source feed', value: 'TRX-9902' },
    ],
  },
};
