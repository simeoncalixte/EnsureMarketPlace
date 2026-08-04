import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceExplorerToolbar } from './MarketplaceExplorerToolbar';

const meta: Meta<typeof MarketplaceExplorerToolbar> = {
  title: 'Pages/Marketplace/MarketplaceExplorerToolbar',
  component: MarketplaceExplorerToolbar,
  argTypes: {
    dealCount: { control: 'number' },
    query: { control: 'text' },
    sort: { control: { type: 'radio', options: ['recent', 'yield'] } },
    canvasView: { control: { type: 'radio', options: ['map', 'list', 'split'] } },
    filtersOpen: { control: 'boolean' },
    activeFilterCount: { control: 'number' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceExplorerToolbar> = (args) => (
  <div style={{ padding: 16 }}>
    <MarketplaceExplorerToolbar {...args} />
  </div>
);

export const Default = Template.bind({});
Default.args = {
  dealCount: 42,
  query: '',
  sort: 'recent' as any,
  canvasView: 'map' as any,
  filtersOpen: false,
  activeFilterCount: 0,
  onQueryChange: () => {},
  onSortChange: () => {},
  onCanvasViewChange: () => {},
  onToggleFilters: () => {},
};

export const WithFilters = Template.bind({});
WithFilters.args = {
  ...Default.args,
  dealCount: 128,
  query: 'flood',
  sort: 'yield' as any,
  canvasView: 'list' as any,
  filtersOpen: true,
  activeFilterCount: 3,
};
