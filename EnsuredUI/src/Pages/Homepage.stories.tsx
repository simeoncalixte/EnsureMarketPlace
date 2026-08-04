import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MarketplacePage from './Marketplace/Marketplace';
import { withAuthenticatedMarketplace } from '../test-helpers/storybookAuthenticatedMarketplace';

const meta: Meta<typeof MarketplacePage> = {
  title: 'Pages/Homepage',
  component: MarketplacePage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MarketplacePage>;

/** The Marketplace is the first page an authenticated user sees after login. */
export const Homepage: Story = {
  decorators: [(StoryFn) => withAuthenticatedMarketplace(StoryFn as React.ComponentType)],
  render: () => <MarketplacePage />,
};
