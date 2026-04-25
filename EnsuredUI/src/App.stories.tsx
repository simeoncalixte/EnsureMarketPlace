import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AppRoutes from './AppRoutes';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';

const fullApplicationRouting = {
  path: '/',
  useStoryElement: true,
  children: [
    { path: '*' },
  ],
};

const meta: Meta<typeof AppRoutes> = {
  title: 'App/Full Application',
  component: AppRoutes,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AppRoutes>;

export const FullApplication: Story = {
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/',
      },
      routing: fullApplicationRouting,
    }),
  },
};