import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import InvestorsPage from './Investors';

const meta: Meta = {
  title: 'Pages/Investors',
  component: InvestorsPage,
};

export default meta;

export const Default: StoryFn = () => <InvestorsPage />;
