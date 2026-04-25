import React from 'react';
import { Meta, Story } from '@storybook/react';
import MarketplacePage from './Marketplace';

const meta: Meta = {
  title: 'Pages/Marketplace',
  component: MarketplacePage,
};

export default meta;

export const Default: Story = () => <MarketplacePage />;
