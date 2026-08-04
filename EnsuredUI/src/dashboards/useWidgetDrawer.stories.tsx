import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import Drawer from "../xds/components/Drawer";
import { LayoutItem, CatalogWidget } from "./types";
import useWidgetDrawer from "./useWidgetDrawer";
import { baseWidgetKey } from "./registry";

export default {
  title: "Dashboards/useWidgetDrawer",
} as Meta;

function Demo({ editing, configuringKey, orgId, catalog, draft }: { editing: boolean; configuringKey: string | null; orgId: number | null; catalog: CatalogWidget[]; draft: LayoutItem[] }) {
  const catalogMap = new Map(catalog.map((c) => [c.widgetKey, c]));
  const catalogEntry = (k: string) => catalogMap.get(k) ?? catalogMap.get(baseWidgetKey(k));
  const updateSetting = (widgetKey: string, key: string, value: unknown) => {
    // no-op for story
    // eslint-disable-next-line no-console
    console.log("updateSetting", widgetKey, key, value);
  };

  const { drawerOpen, drawerTitle, drawerWidth, drawerContent } = useWidgetDrawer({
    editing,
    configuringKey,
    draft,
    catalogEntry,
    organizationId: orgId,
    updateSetting,
  });

  return (
    <Drawer open={drawerOpen} title={drawerTitle} subtitle="Settings apply to the layout you're editing." width={drawerWidth} onClose={() => {}}>
      {drawerContent}
    </Drawer>
  );
}

const sampleCatalog: CatalogWidget[] = [
  { widgetKey: "custom-metric", title: "Custom Metric", category: "metrics", defaultSize: { w: 4, h: 6 }, minSize: { w: 3, h: 3 }, instanceable: true },
  { widgetKey: "chart-1", title: "Chart One", category: "analytics", defaultSize: { w: 4, h: 6 }, minSize: { w: 2, h: 2 } },
];

const sampleDraft: LayoutItem[] = [
  { widgetKey: "custom-metric:1", x: 0, y: 0, w: 4, h: 6, settings: { title: "Metric A" } },
  { widgetKey: "chart-1", x: 0, y: 6, w: 4, h: 6 },
];

export const MetricWithOrg: StoryFn = () => <Demo editing={true} configuringKey={"custom-metric:1"} orgId={1} catalog={sampleCatalog} draft={sampleDraft} />;
export const MetricNoOrg: StoryFn = () => <Demo editing={true} configuringKey={"custom-metric:1"} orgId={null} catalog={sampleCatalog} draft={sampleDraft} />;
export const WidgetSettings: StoryFn = () => <Demo editing={true} configuringKey={"chart-1"} orgId={1} catalog={sampleCatalog} draft={sampleDraft} />;
