import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import DashboardGrid from "./DashboardGrid";
import type { CatalogWidget, LayoutItem } from "./types";
import { itemsToRgl } from "./utils";

export default {
  title: "Dashboards/DashboardGrid",
  component: DashboardGrid,
} as Meta<typeof DashboardGrid>;

const sampleCatalog: CatalogWidget[] = [
  {
    widgetKey: "chart-1",
    title: "Chart One",
    category: "analytics",
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 2 },
  },
  {
    widgetKey: "custom-metric",
    title: "Custom Metric",
    category: "metrics",
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 3 },
    instanceable: true,
  },
];

const sampleDraft: LayoutItem[] = [
  { widgetKey: "chart-1", x: 0, y: 0, w: 4, h: 6 },
  { widgetKey: "custom-metric:1", x: 0, y: 6, w: 4, h: 6, settings: { title: "Active Submissions" } },
];

const catalogMap = new Map(sampleCatalog.map((c) => [c.widgetKey, c]));

const registry = {
  "chart-1": (item: LayoutItem, settings: any) => <div style={{ padding: 8 }}>Chart: {settings.title ?? 'Chart One'}</div>,
  "custom-metric": (item: LayoutItem, settings: any) => <div style={{ padding: 8 }}>Metric: {settings.title ?? 'Metric'}</div>,
};

const Template: StoryFn<typeof DashboardGrid> = (args) => <DashboardGrid {...args} />;

export const Default = Template.bind({});
Default.args = {
  liveItems: sampleDraft,
  catalogEntry: (k: string) => catalogMap.get(k) ?? catalogMap.get(k.split(":")[0]),
  registry: registry as any,
  editing: true,
  onConfigure: (k: string) => console.log("configure", k),
  onRemove: (k: string) => console.log("remove", k),
  onLayoutChange: (l: any) => console.log("layout", l),
  rglLayout: itemsToRgl(sampleDraft, catalogMap, true),
};
