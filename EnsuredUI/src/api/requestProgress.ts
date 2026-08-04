import { useSyncExternalStore } from 'react';

export type ApiRequestProgressStatus = 'idle' | 'pending' | 'success' | 'error';

export type ApiRequestProgressMeta = {
  label: string;
  description: string;
  icon: string;
  successLabel: string;
  errorLabel: string;
  required: boolean;
  matches: (path: string, method: string) => boolean;
};

/**
 * Human-facing copy for every request made while the marketplace homepage is
 * assembled. `matches` keeps dynamic organization IDs and query strings out of
 * the UI layer while retaining one stable request identity.
 */
export const MARKETPLACE_HOMEPAGE_REQUESTS = {
  session: {
    label: 'Secure session', description: 'Confirming your identity and workspace access.', icon: 'shield',
    successLabel: 'Session verified', errorLabel: 'Session could not be verified', required: true,
    matches: (path, method) => method === 'GET' && path.includes('/api/auth/me'),
  },
  navigation: {
    label: 'Workspace navigation', description: 'Loading the tools available to your role.', icon: 'route',
    successLabel: 'Navigation ready', errorLabel: 'Using limited navigation', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/navigation'),
  },
  dashboard: {
    label: 'Dashboard layout', description: 'Resolving your organization and personal workspace layout.', icon: 'dashboard',
    successLabel: 'Layout resolved', errorLabel: 'Dashboard layout unavailable', required: true,
    matches: (path, method) => method === 'GET' && /\/api\/dashboards\/marketplace\/layout(?:\?|$)/.test(path),
  },
  opportunities: {
    label: 'Capital opportunities', description: 'Finding active and partially funded risk opportunities.', icon: 'opportunity',
    successLabel: 'Opportunities loaded', errorLabel: 'Opportunity feed unavailable', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/marketplace/opportunities/active-pending-funding'),
  },
  taxonomy: {
    label: 'Lines of business', description: 'Loading the insurance taxonomy used by marketplace filters.', icon: 'taxonomy',
    successLabel: 'Lines of business loaded', errorLabel: 'Line-of-business filters unavailable', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/marketplace/line-of-business-taxonomy'),
  },
  perils: {
    label: 'Peril taxonomy', description: 'Loading the current peril vocabulary for risk discovery.', icon: 'storm',
    successLabel: 'Perils loaded', errorLabel: 'Peril filters unavailable', required: false,
    matches: (path, method) => method === 'GET' && /\/api\/organizations\/[^/]+\/field-options\/entity\/peril/.test(path),
  },
  filters: {
    label: 'Market filters', description: 'Preparing organization-specific discovery controls.', icon: 'filter',
    successLabel: 'Filters ready', errorLabel: 'Using standard filters', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/marketplace/filters/manifest'),
  },
  riskEvents: {
    label: 'Live risk events', description: 'Checking current catastrophe and hazard signals.', icon: 'pulse',
    successLabel: 'Risk signals current', errorLabel: 'Live risk signals unavailable', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/risk-layers/active-events'),
  },
  preferences: {
    label: 'Map preferences', description: 'Restoring your saved marketplace visualization settings.', icon: 'palette',
    successLabel: 'Preferences restored', errorLabel: 'Using default preferences', required: false,
    matches: (path, method) => method === 'GET' && path.includes('/api/me/preferences/map_submission_type_colors'),
  },
} satisfies Record<string, ApiRequestProgressMeta>;

export type MarketplaceHomepageRequestId = keyof typeof MARKETPLACE_HOMEPAGE_REQUESTS;
export type ApiRequestProgressItem = ApiRequestProgressMeta & {
  id: MarketplaceHomepageRequestId;
  status: ApiRequestProgressStatus;
  error?: string;
  startedAt?: number;
  settledAt?: number;
};

type InternalState = ApiRequestProgressItem & { generation: number };
export type TrackedApiRequestToken = {
  id: MarketplaceHomepageRequestId;
  generation: number;
};
const state = new Map<MarketplaceHomepageRequestId, InternalState>();
const listeners = new Set<() => void>();
let snapshot: ApiRequestProgressItem[] = [];

function emit() {
  snapshot = Array.from(state.values()).map(({ generation: _generation, ...item }) => item);
  listeners.forEach((listener) => listener());
}

function identify(path: string, method: string): MarketplaceHomepageRequestId | undefined {
  return (Object.keys(MARKETPLACE_HOMEPAGE_REQUESTS) as MarketplaceHomepageRequestId[])
    .find((id) => MARKETPLACE_HOMEPAGE_REQUESTS[id].matches(path, method));
}

export function beginTrackedApiRequest(path: string, method: string): TrackedApiRequestToken | undefined {
  const id = identify(path, method.toUpperCase());
  if (!id) return undefined;
  const meta = MARKETPLACE_HOMEPAGE_REQUESTS[id];
  const previous = state.get(id);
  // A newly dispatched request supersedes any abandoned request for the same
  // resource. Its generation token prevents an older promise from settling the
  // new request if it eventually completes out of order.
  const generation = (previous?.generation ?? 0) + 1;
  state.set(id, { id, ...meta, status: 'pending', startedAt: Date.now(), generation });
  emit();
  return { id, generation };
}

export function settleTrackedApiRequest(token: TrackedApiRequestToken | undefined, ok: boolean, error?: string) {
  if (!token) return;
  const previous = state.get(token.id);
  if (!previous || previous.generation !== token.generation) return;
  state.set(token.id, {
    ...previous,
    status: ok ? 'success' : 'error',
    error: ok ? undefined : error,
    settledAt: Date.now(),
  });
  emit();
}

export function useMarketplaceHomepageRequestProgress(): ApiRequestProgressItem[] {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => snapshot,
    () => snapshot,
  );
}
