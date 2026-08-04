import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AppRoutes from './AppRoutes';
import { GlobalChatProvider } from './app-sections/GlobalChat';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import {
  storybookMarketplaceHomepage,
  storybookOpportunities,
  storybookRiskEvents,
  storybookTaxonomy,
  withAuthenticatedMarketplace,
  type MarketplaceStoryScenario,
} from './test-helpers/storybookAuthenticatedMarketplace';

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

const authenticatedHomepage = (scenario: MarketplaceStoryScenario = {}): Story => ({
  decorators: [
    (StoryFn) => withAuthenticatedMarketplace(StoryFn as React.ComponentType, scenario),
  ],
  render: () => (
    <GlobalChatProvider>
      <AppRoutes />
    </GlobalChatProvider>
  ),
  parameters: {
    reactRouter: reactRouterParameters({
      location: { path: '/marketplace' },
      routing: fullApplicationRouting,
    }),
  },
});

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

/** The first available workspace screen after a successful sign-in. */
export const Homepage: Story = {
  ...authenticatedHomepage(),
};

/** Initial route load while the dashboard layout is being resolved. */
export const HomepageLoadingDashboard: Story = authenticatedHomepage({ pending: ['dashboard'] });

/** Full request-driven lifecycle: orbit completion hold followed by the dashboard crossfade. Reload to replay. */
export const HomepageDashboardLoadingTransition: Story = authenticatedHomepage({
  delays: { dashboard: 1400, opportunities: 20_000, taxonomy: 16_000 },
  opportunities: storybookOpportunities,
  taxonomy: storybookTaxonomy,
});

/** Loaded successfully, but no opportunities are currently seeking capital. */
export const HomepageEmptyMarketplace: Story = authenticatedHomepage({
  taxonomy: storybookTaxonomy,
  perils: [{ value: 'wind', label: 'Wind' }, { value: 'earthquake', label: 'Earthquake' }],
});

/** A healthy marketplace with varied lines, returns, funding states and locations. */
export const HomepageActiveMarketplace: Story = authenticatedHomepage({
  opportunities: storybookOpportunities,
  taxonomy: storybookTaxonomy,
  riskEvents: storybookRiskEvents,
  perils: [
    { value: 'wind', label: 'Wind' },
    { value: 'marine', label: 'Marine' },
    { value: 'earthquake', label: 'Earthquake' },
    { value: 'liability', label: 'Liability' },
  ],
});

/** Opportunities have loaded, but every tranche is newly opened and unfunded. */
export const HomepageNewOpportunities: Story = authenticatedHomepage({
  opportunities: storybookOpportunities.filter((item) => item.fundingState === 'new'),
  taxonomy: storybookTaxonomy,
});

/** Opportunities already have investor commitments and show funding progress. */
export const HomepagePartiallyFunded: Story = authenticatedHomepage({
  opportunities: storybookOpportunities.filter((item) => item.fundingState === 'partially_funded'),
  taxonomy: storybookTaxonomy,
});

/** Opportunity feed is still loading after the surrounding dashboard appears. */
export const HomepageLoadingOpportunities: Story = authenticatedHomepage({
  pending: ['opportunities'],
  taxonomy: storybookTaxonomy,
});

/** Opportunity service failure with the page's retry-oriented error state. */
export const HomepageOpportunitiesUnavailable: Story = authenticatedHomepage({
  opportunitiesStatus: 503,
  taxonomy: storybookTaxonomy,
});

/** Taxonomy failure leaves the marketplace usable while filters report degradation. */
export const HomepageTaxonomyUnavailable: Story = authenticatedHomepage({
  opportunities: storybookOpportunities,
  taxonomyStatus: 503,
});

/** Live catastrophe signals populate the homepage ticker and signal surfaces. */
export const HomepageActiveRiskEvents: Story = authenticatedHomepage({
  opportunities: storybookOpportunities,
  taxonomy: storybookTaxonomy,
  riskEvents: storybookRiskEvents,
});

/** An administrator sees the same live market plus dashboard customization controls. */
export const HomepageAdministrator: Story = authenticatedHomepage({
  user: { id: 1, email: 'admin@ensured.local', firstName: 'Avery', lastName: 'Admin', role: 'admin' },
  opportunities: storybookOpportunities,
  taxonomy: storybookTaxonomy,
});

/** An organization-specific layout omits the market-signals footer widget. */
export const HomepageOrganizationLayout: Story = authenticatedHomepage({
  opportunities: storybookOpportunities,
  taxonomy: storybookTaxonomy,
  dashboard: {
    ...storybookMarketplaceHomepage,
    source: 'org',
    org: {
      surfaceKey: 'marketplace',
      version: 1,
      items: storybookMarketplaceHomepage.effective.items.filter(
        (item) => item.widgetKey !== 'marketplace-footer',
      ),
    },
    effective: {
      surfaceKey: 'marketplace',
      version: 1,
      items: storybookMarketplaceHomepage.effective.items.filter(
        (item) => item.widgetKey !== 'marketplace-footer',
      ),
    },
  },
});

/** Layout endpoint failure before any homepage widgets can be resolved. */
export const HomepageDashboardUnavailable: Story = authenticatedHomepage({ dashboardStatus: 503 });
