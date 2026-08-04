import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import DashboardLoadingConcept from './DashboardLoadingConcept';
import { MARKETPLACE_HOMEPAGE_REQUESTS, type ApiRequestProgressItem } from '../api/requestProgress';

const requestStates = (statuses: Partial<Record<keyof typeof MARKETPLACE_HOMEPAGE_REQUESTS, ApiRequestProgressItem['status']>>) =>
  (Object.entries(MARKETPLACE_HOMEPAGE_REQUESTS) as Array<[keyof typeof MARKETPLACE_HOMEPAGE_REQUESTS, (typeof MARKETPLACE_HOMEPAGE_REQUESTS)[keyof typeof MARKETPLACE_HOMEPAGE_REQUESTS]]>)
    .map(([id, meta]) => ({ id, ...meta, status: statuses[id] ?? 'idle' }));

const loadingRequests = requestStates({
  session: 'success', navigation: 'success', dashboard: 'pending', opportunities: 'pending',
  taxonomy: 'success', perils: 'pending', filters: 'success', riskEvents: 'pending', preferences: 'success',
});

const meta: Meta<typeof DashboardLoadingConcept> = {
  title: 'App/Full Application/Loading Concepts',
  component: DashboardLoadingConcept,
  parameters: { layout: 'fullscreen' },
  args: { variant: 'orbit', requests: loadingRequests },
};

export default meta;
type Story = StoryObj<typeof DashboardLoadingConcept>;

/** Branded and atmospheric; best when the dashboard load usually lasts more than a beat. */
export const MarketOrbit: Story = { args: { variant: 'orbit' } };

/** Familiar and reassuring; previews the structure that will replace it with minimal perceived layout shift. */
export const AssemblingWorkspace: Story = { args: { variant: 'skeleton' } };

/** Active and data-oriented; makes the wait feel like meaningful market analysis. */
export const LiveSignalStream: Story = { args: { variant: 'signals' } };

/** A truthful degraded state: failed optional services stay visibly failed while the required layout continues loading. */
export const DegradedServices: Story = {
  args: {
    variant: 'orbit',
    requests: requestStates({
      session: 'success', navigation: 'success', dashboard: 'pending', opportunities: 'error',
      taxonomy: 'success', perils: 'error', filters: 'success', riskEvents: 'error', preferences: 'success',
    }),
  },
};
