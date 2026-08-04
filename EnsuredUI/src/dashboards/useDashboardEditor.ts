import { useCallback, useMemo, useState } from 'react'
import type { Layout as RglLayout } from 'react-grid-layout'
import type { CatalogWidget, LayoutItem, MetricPreset, ResolvedDashboard } from './types'
import { instanceId, nextRowY } from './utils'

type EditScope = 'user' | 'org'

export function useDashboardEditor(data: ResolvedDashboard | null) {
  const [editing, setEditing] = useState(false)
  const [scope, setScope] = useState<EditScope>('user')
  const [draft, setDraft] = useState<LayoutItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [configuringKey, setConfiguringKey] = useState<string | null>(null)

  const beginEdit = useCallback(
    (which: EditScope) => {
      if (!data) return
      const seed = which === 'org' ? data.org ?? data.platform : data.effective
      setScope(which)
      setDraft(seed.items.map((it) => ({ ...it })))
      setEditing(true)
      setShowAdd(false)
      setConfiguringKey(null)
    },
    [data],
  )

  const onLayoutChange = useCallback((next: RglLayout[]) => {
    setDraft((prev) => {
      const byKey = new Map(prev.map((it) => [it.widgetKey, it]))
      return next.map((n) => ({
        ...(byKey.get(n.i) ?? { widgetKey: n.i }),
        widgetKey: n.i,
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
      }))
    })
  }, [])

  const addWidget = useCallback((cat: CatalogWidget) => {
    const widgetKey = cat.instanceable ? `${cat.widgetKey}:${instanceId()}` : cat.widgetKey
    setDraft((prev) => [
      ...prev,
      { widgetKey, x: 0, y: nextRowY(prev), w: cat.defaultSize.w, h: cat.defaultSize.h },
    ])
    setShowAdd(false)
    if (cat.instanceable) setConfiguringKey(widgetKey)
  }, [])

  const addPreset = useCallback((preset: MetricPreset) => {
    const widgetKey = `custom-metric:${instanceId()}`
    setDraft((prev) => [
      ...prev,
      { widgetKey, x: 0, y: nextRowY(prev), w: 4, h: 6, settings: { title: preset.title, definition: preset.definition } },
    ])
    setShowAdd(false)
  }, [])

  const removeWidget = useCallback((key: string) => {
    setDraft((prev) => prev.filter((it) => it.widgetKey !== key))
    setConfiguringKey((cur) => (cur === key ? null : cur))
  }, [])

  const updateSetting = useCallback((widgetKey: string, key: string, value: unknown) => {
    setDraft((prev) =>
      prev.map((it) => {
        if (it.widgetKey !== widgetKey) return it
        const next = { ...(it.settings ?? {}) } as Record<string, unknown>
        if (value === undefined) delete next[key]
        else next[key] = value
        return { ...it, settings: Object.keys(next).length ? next : undefined }
      }),
    )
  }, [])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setDraft([])
    setShowAdd(false)
    setConfiguringKey(null)
  }, [])

  const placedKeys = useMemo(() => new Set(draft.map((it) => it.widgetKey)), [draft])

  const addable = useMemo(() => (data?.catalog ?? []).filter((c) => c.instanceable || !placedKeys.has(c.widgetKey)), [data?.catalog, placedKeys])

  const liveItems = editing ? draft : data?.effective.items ?? []

  return {
    editing,
    scope,
    draft,
    showAdd,
    configuringKey,
    beginEdit,
    cancelEdit,
    onLayoutChange,
    addWidget,
    addPreset,
    removeWidget,
    updateSetting,
    setConfiguringKey,
    setShowAdd,
    addable,
    liveItems,
    placedKeys,
    setDraft,
  }
}

export default useDashboardEditor
