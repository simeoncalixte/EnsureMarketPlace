import { useCallback, useMemo } from 'react';
import type { Layout as RglLayout } from 'react-grid-layout';
import { baseWidgetKey } from './registry';
import { itemsToRgl } from './utils';
import type { CatalogWidget, LayoutItem } from './types';

export function useDashboardCatalog(catalog: CatalogWidget[] | undefined | null, liveItems: LayoutItem[], editing: boolean) {
  const catalogMap = useMemo(() => new Map((catalog ?? []).map((c) => [c.widgetKey, c])), [catalog]);

  const catalogEntry = useCallback(
    (widgetKey: string) => catalogMap.get(widgetKey) ?? catalogMap.get(baseWidgetKey(widgetKey)),
    [catalogMap],
  );

  const rglLayout = useMemo((): RglLayout[] => itemsToRgl(liveItems, catalogMap, editing), [liveItems, catalogMap, editing]);

  return { catalogMap, catalogEntry, rglLayout } as const;
}

export default useDashboardCatalog;
