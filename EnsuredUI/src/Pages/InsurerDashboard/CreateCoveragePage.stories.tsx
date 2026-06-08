import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import InsurerDashboard from './InsurerDashboard';

const meta: Meta<typeof InsurerDashboard> = {
  title: 'Pages/Insurer Dashboard/Create Coverage',
  component: InsurerDashboard,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

const sourceSubmission = {
  submissionId: 9902,
  submissionNumber: 'TRX-9902',
  cedent: 'Munich Re Institutional',
  lineOfBusiness: 'Property',
  locationText: 'Houston, TX',
  region: 'US-GULF',
  premium: 12000000,
  exposure: 950000000,
  receivedLabel: '2026-04-26 09:30 UTC',
  owner: 'Underwriting',
  source: 'portal',
  notes: 'Preloaded coverage creation example for the insured subject page.',
};

function StoryApp() {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  return <InsurerDashboard />;
}

export const Default: Story = {
  render: () => <StoryApp />,
  parameters: {
    reactRouter: reactRouterParameters({
      routing: {
        path: '/insurer/coverage/create',
        useStoryElement: true,
      },
      location: {
        path: '/insurer/coverage/create',
        state: { sourceSubmission },
      },
    }),
  },
};