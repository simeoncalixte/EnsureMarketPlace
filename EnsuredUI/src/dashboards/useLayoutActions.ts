import { useCallback } from 'react';
import type { DashboardLayoutDoc, LayoutItem, SurfaceKey } from './types';

type SaveLayoutFn = (doc: DashboardLayoutDoc, scope: 'user' | 'org', organizationId?: number | null) => Promise<unknown>;
type ResetLayoutFn = (scope: 'user' | 'org', organizationId?: number | null) => Promise<unknown>;

export function useLayoutActions({
  saveLayout,
  resetLayout,
  scope,
  organizationId,
  draft,
  surfaceKey,
  cancelEdit,
}: {
  saveLayout: SaveLayoutFn;
  resetLayout: ResetLayoutFn;
  scope: 'user' | 'org';
  organizationId?: number | null;
  draft: LayoutItem[];
  surfaceKey: SurfaceKey;
  cancelEdit: () => void;
}) {
  const save = useCallback(async () => {
    const doc: DashboardLayoutDoc = { surfaceKey, version: 1, items: draft };
    try {
      await saveLayout(doc, scope, organizationId);
      cancelEdit();
    } catch (err) {
      // lifecycle hook surfaces errors; swallow here to keep caller simple
    }
  }, [saveLayout, scope, organizationId, draft, surfaceKey, cancelEdit]);

  const reset = useCallback(async () => {
    try {
      await resetLayout(scope, organizationId);
      cancelEdit();
    } catch (err) {
      // lifecycle hook surfaces errors; swallow here to keep caller simple
    }
  }, [resetLayout, scope, organizationId, cancelEdit]);

  return { save, reset } as const;
}

export default useLayoutActions;
