import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SigningSection from './SigningSection';

const meta: Meta<typeof SigningSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Signing',
  component: SigningSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    checks: [
      { label: 'Underwriter', value: 'Ready for review' },
      { label: 'Cedent', value: 'Munich Re Institutional' },
      { label: 'Execution packet', value: 'Queued after submission' },
    ],
  },
};
