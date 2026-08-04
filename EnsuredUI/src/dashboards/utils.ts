import type { Layout as RglLayout } from 'react-grid-layout'
import type { CatalogWidget, LayoutItem } from './types'

export function itemsToRgl(items: LayoutItem[], catalog: Map<string, CatalogWidget>, editing: boolean): RglLayout[] {
  return items.map((it) => {
    const cat = catalog.get(it.widgetKey) ?? catalog.get(it.widgetKey.split(':')[0]);
    return {
      i: it.widgetKey,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      minW: cat?.minSize.w ?? 2,
      minH: cat?.minSize.h ?? 2,
      static: !editing,
    }
  })
}

export function nextRowY(items: LayoutItem[]): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0)
}

export function instanceId(): string {
  const c = (globalThis as any).crypto
  if (c?.randomUUID) return c.randomUUID().slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

export default {}
