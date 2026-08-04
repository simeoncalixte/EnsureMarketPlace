import React from "react";
import { Meta, StoryFn } from "@storybook/react";
import DashboardAddPanel from "./DashboardAddPanel";
import type { CatalogWidget, MetricPreset } from "./types";

export default {
  title: "Dashboards/DashboardAddPanel",
  component: DashboardAddPanel,
} as Meta<typeof DashboardAddPanel>;

const Template: StoryFn<typeof DashboardAddPanel> = (args) => <DashboardAddPanel {...args} />;

const sampleCatalog: CatalogWidget[] = [
  {
    widgetKey: "chart-1",
    title: "Chart One",
    category: "analytics",
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 2 },
    instanceable: false,
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

const samplePresets: MetricPreset[] = [
  {
    id: "preset-1",
    title: "Submission Count",
    group: "Default",
    definition: {
      terms: [{ name: "count", modelKey: "submission", fn: "count" } as any],
      formula: "count",
      viz: "kpi",
    } as any,
  },
];

export const Default = Template.bind({});
Default.args = {
  addable: sampleCatalog,
  presets: samplePresets,
  onAddWidget: () => undefined,
  onAddPreset: () => undefined,
};
