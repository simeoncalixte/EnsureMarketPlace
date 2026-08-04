import { useCallback, useEffect, useState } from 'react';
import {
  getDashboard,
  saveOrgLayout,
  saveUserLayout,
  resetOrgLayout,
  resetUserLayout,
} from './api';
import type { DashboardLayoutDoc, ResolvedDashboard, SurfaceKey } from './types';

export function useDashboardLifecycle(surfaceKey: SurfaceKey, initialData?: ResolvedDashboard | null) {
  const [data, setData] = useState<ResolvedDashboard | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard(surfaceKey);
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [surfaceKey]);

  useEffect(() => {
    if (!initialData) void load();
  }, [initialData, load]);

  const saveLayout = useCallback(
    async (doc: DashboardLayoutDoc, scope: 'user' | 'org', organizationId?: number | null) => {
      setBusy(true);
      setError(null);
      try {
        if (scope === 'org') {
          if (organizationId == null) throw new Error('No organization to save to');
          await saveOrgLayout(organizationId, surfaceKey, doc);
        } else {
          await saveUserLayout(surfaceKey, doc);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save layout');
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [load, surfaceKey],
  );

  const resetLayout = useCallback(
    async (scope: 'user' | 'org', organizationId?: number | null) => {
      setBusy(true);
      setError(null);
      try {
        if (scope === 'org') {
          if (organizationId != null) await resetOrgLayout(organizationId, surfaceKey);
        } else {
          await resetUserLayout(surfaceKey);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset layout');
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [load, surfaceKey],
  );

  return { data, loading, error, busy, load, saveLayout, resetLayout, setData, setError };
}
