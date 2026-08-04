import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MarketplaceDealsSection } from './MarketplaceDealsSection';

const sampleTranche = {
  id: '1-1',
  dealId: 1,
  dealName: 'Sample Deal',
  dealStatus: 'open',
  trancheId: 1,
  fundingState: 'new',
  trancheName: 'Tranche A',
  riskLevel: 'moderate',
  expectedReturnPct: 5,
  maxLoss: 0,
  durationMonths: 12,
  capitalRequired: 100000,
  committedCapital: 0,
  fundedAmount: 0,
  pendingAmount: 100000,
  fundingProgressPct: 0,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  latitude: 37,
  longitude: -122,
} as any;

const sampleDeal = {
  dealId: 1,
  dealName: 'Sample Deal',
  dealStatus: 'open',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  tranches: [sampleTranche],
  totalDealSize: 100000,
  durationMonths: 12,
} as any;

const meta: Meta<typeof MarketplaceDealsSection> = {
  title: 'Pages/Marketplace/MarketplaceDealsSection',
  component: MarketplaceDealsSection,
  argTypes: {
    viewMode: { control: { type: 'radio', options: ['aggregated', 'table'] } },
    isLoading: { control: 'boolean' },
    error: { control: 'text' },
    totalOpportunityCount: { control: 'number' },
    highlightedDealId: { control: 'text' },
    opportunities: { control: 'object' },
    deals: { control: 'object' },
    tableRows: { control: 'object' },
    onViewModeChange: { action: 'onViewModeChange' },
  },
};

export default meta;

const Template: StoryFn<typeof MarketplaceDealsSection> = (args) => (
  <div style={{ padding: 16 }}>
    <MarketplaceDealsSection {...args} />
  </div>
);

export const Aggregated = Template.bind({});
Aggregated.args = {
  viewMode: 'aggregated',
  onViewModeChange: action('onViewModeChange') as any,
  isLoading: false,
  error: null,
  opportunities: [sampleTranche],
  totalOpportunityCount: 1,
  deals: [sampleDeal],
  tableRows: [],
  highlightedDealId: null,
};

export const TableView = Template.bind({});
TableView.args = {
  ...Aggregated.args,
  viewMode: 'table',
  deals: [],
  tableRows: [],
};

export const Loading = Template.bind({});
Loading.args = {
  ...Aggregated.args,
  isLoading: true,
  opportunities: [],
  totalOpportunityCount: 0,
  deals: [],
};

export const ErrorState = Template.bind({});
ErrorState.args = {
  ...Aggregated.args,
  isLoading: false,
  error: 'Unable to fetch opportunities',
  opportunities: [],
  totalOpportunityCount: 0,
  deals: [],
};
