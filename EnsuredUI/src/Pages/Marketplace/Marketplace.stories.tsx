import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import MarketplacePage from './Marketplace';

const meta: Meta = {
  title: 'Pages/Marketplace',
  component: MarketplacePage,
};

export default meta;

export const Default: StoryFn = () => <MarketplacePage />;
