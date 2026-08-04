import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceBodyLayout } from './MarketplaceBodyLayout';

const meta: Meta<typeof MarketplaceBodyLayout> = {
  title: 'Pages/Marketplace/MarketplaceBodyLayout',
  component: MarketplaceBodyLayout,
  argTypes: {
    filters: { control: 'text' },
    deals: { control: 'text' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceBodyLayout> = (args) => (
  <div style={{ padding: 16 }}>
    <MarketplaceBodyLayout filters={<div>{String(args.filters)}</div>} deals={<div>{String(args.deals)}</div>} />
  </div>
);

export const Default = Template.bind({});
Default.args = { filters: 'Filters here', deals: 'Deals here' };
