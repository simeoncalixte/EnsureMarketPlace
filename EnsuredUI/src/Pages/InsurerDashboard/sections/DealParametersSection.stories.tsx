import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import DealParametersSection from './DealParametersSection';

const meta: Meta<typeof DealParametersSection> = {
  title: 'Pages/Insurer Dashboard/Sections/General Information',
  component: DealParametersSection,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    name: 'TRX-9902',
    cedingEntity: 'Munich Re Institutional',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    sourceCedent: 'Munich Re Institutional',
    onSetName: () => {},
    onSetCedingEntity: () => {},
    onSetStartDate: () => {},
    onSetEndDate: () => {},
  },
};
