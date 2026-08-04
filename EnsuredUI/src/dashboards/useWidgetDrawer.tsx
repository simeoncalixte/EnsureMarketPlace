import React from "react";
import MetricBuilder from "./MetricBuilder";
import WidgetSettingsForm from "./WidgetSettingsForm";
import { baseWidgetKey } from "./registry";
import type { LayoutItem, CatalogWidget } from "./types";
import type { MetricDefinition } from "./metricTypes";
import { MARKETPLACE_STATS_SETTINGS_SCHEMA } from "./marketplaceStatsSettings";

export type UseWidgetDrawerOptions = {
  editing: boolean;
  configuringKey: string | null;
  configuringSection?: string | null;
  draft: LayoutItem[];
  catalogEntry: (widgetKey: string) => CatalogWidget | undefined;
  organizationId?: number | null;
  updateSetting: (widgetKey: string, key: string, value: unknown) => void;
};

export function useWidgetDrawer({
  editing,
  configuringKey,
  configuringSection,
  draft,
  catalogEntry,
  organizationId,
  updateSetting,
}: UseWidgetDrawerOptions) {
  const configuringItem = React.useMemo<LayoutItem | undefined>(() => {
    if (!editing || !configuringKey) return undefined;
    return draft.find((it) => it.widgetKey === configuringKey);
  }, [editing, configuringKey, draft]);

  const configuringCat = React.useMemo(() => (configuringKey ? catalogEntry(configuringKey) : undefined), [configuringKey, catalogEntry]);

  const isConfiguringMetric = React.useMemo(() => Boolean(configuringKey && baseWidgetKey(configuringKey) === "custom-metric"), [configuringKey]);

  const cardNumber = /^card(\d)$/.exec(configuringSection ?? '')?.[1];
  const drawerTitle = cardNumber
    ? `Configure · Marketplace Overview · Card ${cardNumber}`
    : configuringCat?.title
    ? `Configure · ${configuringCat.title}`
    : "Configure widget";
  const drawerOpen = Boolean(configuringItem);
  const drawerWidth = isConfiguringMetric ? "460px" : undefined;

  const drawerContent = React.useMemo(() => {
    if (!configuringItem) return null;
    if (isConfiguringMetric) {
      return organizationId == null ? (
        <div style={{ fontSize: 13 }}>Join an organization to build metrics from its data.</div>
      ) : (
        <MetricBuilder
            organizationId={organizationId}
            value={configuringItem.settings?.definition as MetricDefinition | undefined}
            onChange={(def) => updateSetting(configuringItem.widgetKey, "definition", def)}
        />
      );
    }

    const baseSettingsSchema = configuringKey === "marketplace-stats"
      ? MARKETPLACE_STATS_SETTINGS_SCHEMA
      : configuringCat?.settingsSchema;
    const settingsSchema = configuringKey === "marketplace-stats" && configuringSection
      ? baseSettingsSchema?.filter((field) => field.key.startsWith(configuringSection))
      : baseSettingsSchema;

    return (
      <WidgetSettingsForm
        widgetTitle={configuringCat?.title ?? configuringItem.widgetKey}
        schema={settingsSchema}
        values={configuringItem.settings ?? {}}
        onChange={(key, value) => updateSetting(configuringItem.widgetKey, key, value)}
        showTitle={configuringKey !== "marketplace-stats"}
      />
    );
  }, [configuringItem, configuringKey, configuringSection, isConfiguringMetric, organizationId, updateSetting, configuringCat]);

  return { drawerOpen, drawerTitle, drawerWidth, drawerContent } as const;
}

export default useWidgetDrawer;
