import React from 'react';
import { Meta, Story } from '@storybook/react';
import InvestorsPage from './Investors';

const meta: Meta = {
  title: 'Pages/Investors',
  component: InvestorsPage,
};

export default meta;

export const Default: Story = () => <InvestorsPage />;
