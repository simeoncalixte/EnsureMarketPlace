import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceActiveFilters, type ActiveFilterChip } from './MarketplaceActiveFilters';

const meta: Meta<typeof MarketplaceActiveFilters> = {
  title: 'Pages/Marketplace/MarketplaceActiveFilters',
  component: MarketplaceActiveFilters,
  argTypes: {
    chips: { control: 'object' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceActiveFilters> = (args) => (
  <div style={{ padding: 16 }}>
    <MarketplaceActiveFilters {...args} />
  </div>
);

export const Empty = Template.bind({});
Empty.args = { chips: [], onClearAll: () => {} };

export const WithChips = Template.bind({});
WithChips.args = {
  chips: [
    { key: 'lob', label: 'Line of business · 2', onRemove: () => {} },
    { key: 'duration', label: 'Max 12M', onRemove: () => {} },
  ] as ActiveFilterChip[],
  onClearAll: () => {},
};
