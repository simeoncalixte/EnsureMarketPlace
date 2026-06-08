import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FinancialsSection from './FinancialsSection';

const meta: Meta<typeof FinancialsSection> = {
  title: 'Pages/Insurer Dashboard/Sections/Financials',
  component: FinancialsSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    coverageLimit: '950000000',
    attachmentPoint: '522500000',
    exhaustionPoint: '1187500000',
    premium: '12000000',
    onSetCoverageLimit: () => {},
    onSetAttachmentPoint: () => {},
    onSetExhaustionPoint: () => {},
    onSetPremium: () => {},
  },
};
