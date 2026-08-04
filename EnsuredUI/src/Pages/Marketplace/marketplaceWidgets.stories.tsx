import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { MarketplaceDataProvider, marketplaceRegistry } from './marketplaceWidgets';

const meta: Meta = {
  title: 'Pages/Marketplace/Widgets',
  component: MarketplaceDataProvider,
};

export default meta;

export const StatsWidget: StoryFn = () => (
  <div style={{ padding: 12 }}>
    <MarketplaceDataProvider>{marketplaceRegistry['marketplace-stats']()}</MarketplaceDataProvider>
  </div>
);

export const ExplorerWidget: StoryFn = () => (
  <div style={{ padding: 12 }}>
    <MarketplaceDataProvider>{marketplaceRegistry['marketplace-explorer']()}</MarketplaceDataProvider>
  </div>
);

export const FooterWidget: StoryFn = () => (
  <div style={{ padding: 12 }}>
    <MarketplaceDataProvider>{marketplaceRegistry['marketplace-footer']()}</MarketplaceDataProvider>
  </div>
);
