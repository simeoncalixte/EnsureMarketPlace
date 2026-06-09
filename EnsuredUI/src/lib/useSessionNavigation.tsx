import { useEffect, useState } from 'react';
import { getSessionNavigation } from '../api/navigation';
import type { NavItem } from '../xds/components/Navigation';

/**
 * Fallback sidebar used only while the session menu is loading or if the
 * `/api/navigation` request fails (e.g. API offline in local dev). It is the
 * least-privileged "browse the marketplace" view — never anything role-gated —
 * so a failed fetch can't expose links a role shouldn't reach.
 */
const FALLBACK_NAV: NavItem[] = [{ id: '/marketplace', label: 'Marketplace', icon: 'MKT' }];

type SessionNavigationState = {
  items: NavItem[];
  /** True until the first fetch (success or failure) settles. */
  loading: boolean;
  error: string | null;
};

/**
 * Loads the role-scoped navigation for the current session from the backend.
 *
 * `roleKey` is passed by the caller (typically `user.role`) purely as a cache
 * key: when the active session changes the menu is re-fetched. The request
 * itself is authenticated by the bearer token the API client attaches, so the
 * server — not the client — decides what the user may see.
 */
export function useSessionNavigation(roleKey?: string | null): SessionNavigationState {
  const [items, setItems] = useState<NavItem[]>(FALLBACK_NAV);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSessionNavigation()
      .then((nav) => {
        if (cancelled) return;
        setItems(Array.isArray(nav.items) && nav.items.length > 0 ? nav.items : FALLBACK_NAV);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems(FALLBACK_NAV);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roleKey]);

  return { items, loading, error };
}
