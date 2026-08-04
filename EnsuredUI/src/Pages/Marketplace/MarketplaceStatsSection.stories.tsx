import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceStatsSection } from './MarketplaceStatsSection';

const meta: Meta<typeof MarketplaceStatsSection> = {
  title: 'Pages/Marketplace/MarketplaceStatsSection',
  component: MarketplaceStatsSection,
  argTypes: {
    summary: { control: 'object' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceStatsSection> = (args) => (
  <div style={{ padding: 16 }}>
    <MarketplaceStatsSection {...args} />
  </div>
);

export const Default = Template.bind({});
Default.args = { summary: { totalOpenCapacity: 1250000, totalFunded: 750000, activeDeals: 12 } };

export const Zero = Template.bind({});
Zero.args = { summary: { totalOpenCapacity: 0, totalFunded: 0, activeDeals: 0 } };

export const Large = Template.bind({});
Large.args = { summary: { totalOpenCapacity: 9125000000, totalFunded: 5430000000, activeDeals: 999 } };
