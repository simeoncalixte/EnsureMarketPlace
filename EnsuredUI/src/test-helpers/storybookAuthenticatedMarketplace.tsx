import React from 'react';
import type { ResolvedDashboard } from '../dashboards/types';
import type {
  LineOfBusinessPrimaryType,
  LiveRiskEvent,
  MarketplaceOpportunity,
} from '../Pages/Marketplace/marketplaceTypes';
import { AUTH_TOKEN_KEY } from '../lib/auth';

const STORYBOOK_TOKEN = 'storybook.authenticated.marketplace';

const defaultUser = {
  id: 101,
  email: 'alex.morgan@example.com',
  firstName: 'Alex',
  lastName: 'Morgan',
  role: 'underwriter',
  organizationId: 1,
};

const homepageItems = [
  { widgetKey: 'marketplace-stats', x: 0, y: 0, w: 12, h: 5 },
  { widgetKey: 'marketplace-explorer', x: 0, y: 5, w: 12, h: 19 },
  { widgetKey: 'marketplace-footer', x: 0, y: 24, w: 12, h: 2 },
];

export const storybookMarketplaceHomepage: ResolvedDashboard = {
  surfaceKey: 'marketplace',
  source: 'platform',
  org: null,
  platform: { surfaceKey: 'marketplace', version: 1, items: homepageItems },
  effective: { surfaceKey: 'marketplace', version: 1, items: homepageItems },
  catalog: [
    { widgetKey: 'marketplace-stats', title: 'Marketplace overview', category: 'marketplace', defaultSize: { w: 12, h: 5 }, minSize: { w: 6, h: 4 } },
    { widgetKey: 'marketplace-explorer', title: 'Marketplace explorer', category: 'marketplace', defaultSize: { w: 12, h: 19 }, minSize: { w: 8, h: 12 } },
    { widgetKey: 'marketplace-footer', title: 'Market signals', category: 'marketplace', defaultSize: { w: 12, h: 2 }, minSize: { w: 6, h: 2 } },
  ],
  presets: [],
};

export const storybookTaxonomy: LineOfBusinessPrimaryType[] = [
  {
    code: 'property',
    label: 'Property',
    subTypes: [
      { code: 'commercial-property', label: 'Commercial Property' },
      { code: 'catastrophe', label: 'Catastrophe' },
    ],
  },
  {
    code: 'specialty',
    label: 'Specialty',
    subTypes: [
      { code: 'marine', label: 'Marine' },
      { code: 'aviation', label: 'Aviation' },
    ],
  },
  {
    code: 'casualty',
    label: 'Casualty',
    subTypes: [{ code: 'general-liability', label: 'General Liability' }],
  },
];

export const storybookOpportunities: MarketplaceOpportunity[] = [
  {
    id: 'atlantic-wind-1', dealId: 201, trancheId: 1, fundingState: 'new',
    dealName: 'Atlantic Wind Portfolio', dealStatus: 'Active', trancheName: 'Senior Layer',
    riskLevel: 'Moderate', expectedReturnPct: 11.8, maxLoss: 3_200_000, durationMonths: 12,
    capitalRequired: 8_000_000, committedCapital: 0, fundedAmount: 0, pendingAmount: 8_000_000,
    fundingProgressPct: 0, startDate: '2026-09-01', endDate: '2027-09-01',
    lineOfBusiness: 'property', lineOfBusinessSubType: 'catastrophe', peril: 'wind',
    latitude: 25.7617, longitude: -80.1918,
  },
  {
    id: 'harbor-marine-1', dealId: 202, trancheId: 1, fundingState: 'partially_funded',
    dealName: 'Harbor Marine Facilities', dealStatus: 'Active', trancheName: 'Working Layer',
    riskLevel: 'Low', expectedReturnPct: 8.4, maxLoss: 1_400_000, durationMonths: 18,
    capitalRequired: 5_000_000, committedCapital: 3_250_000, fundedAmount: 3_250_000,
    pendingAmount: 1_750_000, fundingProgressPct: 65, startDate: '2026-08-15', endDate: '2028-02-15',
    lineOfBusiness: 'specialty', lineOfBusinessSubType: 'marine', peril: 'marine',
    latitude: 29.9511, longitude: -90.0715,
  },
  {
    id: 'metro-property-1', dealId: 203, trancheId: 1, fundingState: 'partially_funded',
    dealName: 'Metro Commercial Property', dealStatus: 'Active', trancheName: 'Excess Layer',
    riskLevel: 'High', expectedReturnPct: 16.2, maxLoss: 6_800_000, durationMonths: 24,
    capitalRequired: 12_000_000, committedCapital: 9_000_000, fundedAmount: 9_000_000,
    pendingAmount: 3_000_000, fundingProgressPct: 75, startDate: '2026-10-01', endDate: '2028-10-01',
    lineOfBusiness: 'property', lineOfBusinessSubType: 'commercial-property', peril: 'earthquake',
    latitude: 34.0522, longitude: -118.2437,
  },
  {
    id: 'liability-1', dealId: 204, trancheId: 1, fundingState: 'new',
    dealName: 'National Liability Program', dealStatus: 'Active', trancheName: 'Quota Share',
    riskLevel: 'Moderate', expectedReturnPct: 10.1, maxLoss: 2_100_000, durationMonths: 36,
    capitalRequired: 6_500_000, committedCapital: 0, fundedAmount: 0, pendingAmount: 6_500_000,
    fundingProgressPct: 0, startDate: '2027-01-01', endDate: '2030-01-01',
    lineOfBusiness: 'casualty', lineOfBusinessSubType: 'general-liability', peril: 'liability',
    latitude: 41.8781, longitude: -87.6298,
  },
];

export const storybookRiskEvents: LiveRiskEvent[] = [
  { title: 'Tropical Storm Iris', place: 'North Atlantic', peril: 'Wind', severityLevel: 'high' },
  { title: 'Wildfire Watch', place: 'Southern California', peril: 'Wildfire', severityLevel: 'moderate' },
  { title: 'Seismic Activity', place: 'Pacific Northwest', peril: 'Earthquake', severityLevel: 'low' },
];

type StorybookUser = typeof defaultUser;

export type MarketplaceStoryScenario = {
  user?: Partial<StorybookUser>;
  opportunities?: MarketplaceOpportunity[];
  taxonomy?: LineOfBusinessPrimaryType[];
  riskEvents?: LiveRiskEvent[];
  perils?: Array<{ value: string; label: string }>;
  dashboard?: ResolvedDashboard;
  dashboardStatus?: number;
  opportunitiesStatus?: number;
  taxonomyStatus?: number;
  /** Keep selected requests pending to expose first-load skeletons/spinners. */
  pending?: Array<'dashboard' | 'opportunities' | 'taxonomy'>;
  /** Delay selected mock responses so request-driven entrance/exit transitions can be reviewed. */
  delays?: Partial<Record<'dashboard' | 'opportunities' | 'taxonomy', number>>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
}

function pendingResponse(): Promise<Response> {
  return new Promise<Response>(() => undefined);
}

/**
 * Gives full-route and page stories a deterministic signed-in marketplace.
 * Every homepage dependency is intercepted so stories never depend on a real
 * account or seeded backend data.
 */
export function withAuthenticatedMarketplace(
  Story: React.ComponentType,
  scenario: MarketplaceStoryScenario = {},
): React.JSX.Element {
  const originalFetch = window.fetch;
  const previousToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const storybookUser = { ...defaultUser, ...scenario.user };
  const pending = new Set(scenario.pending ?? []);
  window.localStorage.setItem(AUTH_TOKEN_KEY, STORYBOOK_TOKEN);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (url.includes('/api/auth/me')) return json(storybookUser);
    if (url.includes('/api/navigation')) {
      return json({
        role: storybookUser.role,
        home: '/marketplace',
        generatedAt: '2026-08-02T00:00:00.000Z',
        items: [{ id: '/marketplace', label: 'Marketplace', icon: 'storefront' }],
      });
    }
    if (url.includes('/api/dashboards/marketplace/layout')) {
      if (pending.has('dashboard')) return pendingResponse();
      if (scenario.delays?.dashboard) {
        await new Promise((resolve) => window.setTimeout(resolve, scenario.delays!.dashboard));
      }
      return json(
        scenario.dashboard ?? storybookMarketplaceHomepage,
        scenario.dashboardStatus ?? 200,
      );
    }
    if (url.includes('/api/marketplace/opportunities/active-pending-funding')) {
      if (pending.has('opportunities')) return pendingResponse();
      if (scenario.delays?.opportunities) {
        await new Promise((resolve) => window.setTimeout(resolve, scenario.delays!.opportunities));
      }
      return json(scenario.opportunities ?? [], scenario.opportunitiesStatus ?? 200);
    }
    if (url.includes('/api/marketplace/line-of-business-taxonomy')) {
      if (pending.has('taxonomy')) return pendingResponse();
      if (scenario.delays?.taxonomy) {
        await new Promise((resolve) => window.setTimeout(resolve, scenario.delays!.taxonomy));
      }
      return json({ primaryTypes: scenario.taxonomy ?? [] }, scenario.taxonomyStatus ?? 200);
    }
    if (url.includes('/api/marketplace/filters/manifest')) return json({});
    if (url.includes('/api/risk-layers/active-events')) {
      return json({ features: (scenario.riskEvents ?? []).map((properties) => ({ properties })) });
    }
    if (url.includes('/api/field-options/')) {
      return json({ items: scenario.perils ?? [] });
    }
    if (url.includes('/api/user-preferences/')) return json({ value: null });
    // Map overlays are optional on the homepage, but isolating them prevents a
    // story from accidentally reaching a developer's local API.
    if (url.includes('/api/submissions') || url.includes('/api/risk-layers')) {
      return json({ features: [], items: [] });
    }
    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  React.useEffect(() => () => {
    window.fetch = originalFetch;
    if (previousToken) window.localStorage.setItem(AUTH_TOKEN_KEY, previousToken);
    else window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }, [originalFetch, previousToken]);

  return <Story />;
}
