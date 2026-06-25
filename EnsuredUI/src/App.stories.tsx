import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AppRoutes from './AppRoutes';
import { GlobalChatProvider } from './app-sections/GlobalChat';
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
  // Match production composition (App.tsx): the global chat wrapper sits
  // around the routes, so the copilot CTA shows here just like in the app.
  render: () => (
    <GlobalChatProvider>
      <AppRoutes />
    </GlobalChatProvider>
  ),
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/',
      },
      routing: fullApplicationRouting,
    }),
  },
};