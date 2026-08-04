import React, { useCallback, useEffect, useMemo, useState } from "react";
import GridLayout, {
  WidthProvider,
  type Layout as RglLayout,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Root, Spacer, Empty, StatusText } from "../xds/components/DashboardHost";
import Button from "../xds/components/Button";
import Drawer from "../xds/components/Drawer";
import { useAuthMe } from "../lib/useAuthMe";
import WidgetFrame from "./WidgetFrame";
import WidgetSettingsForm from "./WidgetSettingsForm";
import MetricBuilder from "./MetricBuilder";
import DashboardToolbar from "./DashboardToolbar";
import DashboardAddPanel from "./DashboardAddPanel";
import useWidgetDrawer from "./useWidgetDrawer";
import {
  baseWidgetKey,
  renderWidget,
  resolveSettings,
  type SurfaceRegistry,
} from "./registry";
import { itemsToRgl } from "./utils";
import useDashboardCatalog from "./useDashboardCatalog";
import DashboardGrid from "./DashboardGrid";
import { useDashboardEditor } from "./useDashboardEditor";
import type { MetricDefinition } from "./metricTypes";
import { useDashboardLifecycle } from "./useDashboardLifecycle";
import DashboardLoadingConcept from './DashboardLoadingConcept';
import DashboardLoadTransition from './DashboardLoadTransition';
import BackgroundRequestProgress from './BackgroundRequestProgress';
import useLayoutActions from "./useLayoutActions";
import type {
  CatalogWidget,
  DashboardLayoutDoc,
  LayoutItem,
  MetricPreset,
  ResolvedDashboard,
  SurfaceKey,
} from "./types";

const Grid = WidthProvider(GridLayout);
const COLS = 12;
const ROW_HEIGHT = 30;

type EditScope = "user" | "org";

export type DashboardHostProps = {
  surfaceKey: SurfaceKey;
  /** Maps widgetKey → body renderer for this surface. */
  registry: SurfaceRegistry;
  /** Test/Storybook seam: inject a pre-resolved dashboard and stub persistence. */
  initialData?: ResolvedDashboard;
  /** Test/Storybook seam: force the customize controls regardless of auth. */
  forceAdmin?: boolean;
};

// Layout helpers moved to `src/dashboards/utils`

// Styles have been moved to `src/xds/components/DashboardHost`

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardHost({
  surfaceKey,
  registry,
  initialData,
  forceAdmin,
}: DashboardHostProps) {
  const [configuringSection, setConfiguringSection] = useState<string | null>(null);
  const [loadingAnimationComplete, setLoadingAnimationComplete] = useState(Boolean(initialData));
  const { user } = useAuthMe();
  const { data, loading, error, busy, saveLayout, resetLayout, load } =
    useDashboardLifecycle(surfaceKey, initialData);

  useEffect(() => {
    if (loading) setLoadingAnimationComplete(false);
  }, [loading]);

  const {
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
  } = useDashboardEditor(data);

  const isAdmin = forceAdmin || user?.role === "admin";
  const organizationId = user?.organizationId ?? null;

  const {catalogEntry, rglLayout } = useDashboardCatalog(data?.catalog, liveItems, editing);

  // `addable` computed inside the editor hook

  // Edit-mode actions are provided by `useDashboardEditor`

  const { save, reset } = useLayoutActions({
    saveLayout,
    resetLayout,
    scope,
    organizationId,
    draft,
    surfaceKey,
    cancelEdit,
  });

  const { drawerOpen, drawerTitle, drawerWidth, drawerContent } = useWidgetDrawer({
    editing,
    configuringKey,
    configuringSection,
    draft,
    catalogEntry,
    organizationId,
    updateSetting,
  });

  // Derived labels and drawer content to simplify JSX and avoid nested ternaries
  const sourceLabel = (() => {
    if (data?.source === "platform") return "Platform default";
    if (data?.source === "org") return "Organization default";
    return "Your layout";
  })();

  const presets = data?.presets ?? [];
  const addCountSuffix = addable.length ? ` (${addable.length})` : "";
  const addButtonLabel = showAdd ? "Close" : `Add widget${addCountSuffix}`;
  const resetLabel = scope === "org" ? "Reset to platform" : "Reset to default";
  const hasNoItems = liveItems.length === 0;

  const resolvedContent = error && !data ? (
    <Root><StatusText $error>{error}</StatusText></Root>
  ) : !data ? (
    <Root><Empty>No dashboard available.</Empty></Root>
  ) : (
    <Root>
      <DashboardToolbar
        editing={editing}
        isAdmin={isAdmin}
        scope={scope}
        showAdd={showAdd}
        addableCount={addable.length}
        error={error}
        busy={busy}
        sourceLabel={sourceLabel}
        beginEdit={beginEdit}
        setShowAdd={setShowAdd}
        reset={reset}
        cancelEdit={cancelEdit}
        save={save}
      />

      {editing && showAdd && (
        <DashboardAddPanel
          addable={addable}
          presets={presets}
          onAddWidget={addWidget}
          onAddPreset={addPreset}
        />
      )}

      <DashboardGrid
        liveItems={liveItems}
        catalogEntry={catalogEntry}
        registry={registry}
        editing={editing}
        onConfigure={(k, sectionKey) => {
          setConfiguringSection(sectionKey ?? null);
          setConfiguringKey(k);
        }}
        onRemove={removeWidget}
        onUpdateSetting={updateSetting}
        onLayoutChange={onLayoutChange}
        rglLayout={rglLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
      />

      <Drawer
        open={drawerOpen}
        title={drawerTitle}
        subtitle="Settings apply to the layout you're editing."
        width={drawerWidth}
        onClose={() => {
          setConfiguringSection(null);
          setConfiguringKey(null);
        }}
      >
        {drawerContent}
      </Drawer>
      <BackgroundRequestProgress />
    </Root>
  );

  return (
    <DashboardLoadTransition
      loading={loading}
      animationComplete={loadingAnimationComplete}
      loader={(
        <DashboardLoadingConcept
          variant="orbit"
          lifecycleComplete={!loading}
          completionRequestIds={['dashboard']}
          onAnimationsComplete={() => setLoadingAnimationComplete(true)}
        />
      )}
    >
      {resolvedContent}
    </DashboardLoadTransition>
  );
}
