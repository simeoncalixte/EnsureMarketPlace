import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import AppRoutes from './AppRoutes';

const appRouting = {
  path: '/',
  useStoryElement: true,
  children: [{ path: '*' }],
};

const meta: Meta<typeof AppRoutes> = {
  title: 'App/Authentication/SignIn',
  component: AppRoutes,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof AppRoutes>;

export const Default: Story = {
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/',
      },
      routing: appRouting,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('link', { name: /sign in/i }));

    await expect(await canvas.findByRole('heading', { name: /secure access/i })).toBeInTheDocument();
  },
};