import React from "react";
import GridLayout, { WidthProvider, type Layout as RglLayout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import WidgetFrame from "./WidgetFrame";
import { Empty } from "../xds/components/DashboardHost";
import { resolveSettings, renderWidget, type SurfaceRegistry } from "./registry";
import type { CatalogWidget, LayoutItem } from "./types";

const Grid = WidthProvider(GridLayout);

type Props = {
  liveItems: LayoutItem[];
  catalogEntry: (widgetKey: string) => CatalogWidget | undefined;
  registry: SurfaceRegistry;
  editing: boolean;
  onConfigure: (widgetKey: string, sectionKey?: string) => void;
  onRemove: (widgetKey: string) => void;
  onUpdateSetting?: (widgetKey: string, key: string, value: unknown) => void;
  onLayoutChange: (layout: RglLayout[]) => void;
  rglLayout: RglLayout[];
  cols?: number;
  rowHeight?: number;
};

export default function DashboardGrid({
  liveItems,
  catalogEntry,
  registry,
  editing,
  onConfigure,
  onRemove,
  onUpdateSetting,
  onLayoutChange,
  rglLayout,
  cols = 12,
  rowHeight = 30,
}: Props) {
  if (liveItems.length === 0) {
    return (
      <Empty>
        This dashboard has no widgets. {editing ? "Add one above." : "Customize to add widgets."}
      </Empty>
    );
  }

  return (
    <Grid
      className="dashboard-grid"
      cols={cols}
      rowHeight={rowHeight}
      margin={[16, 16]}
      layout={rglLayout}
      isDraggable={editing}
      isResizable={editing}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={onLayoutChange}
      compactType="vertical"
    >
      {liveItems.map((item) => {
        const cat = catalogEntry(item.widgetKey);
        const settings = resolveSettings(cat?.settingsSchema, item.settings);
        const title = (typeof settings.title === "string" && settings.title) || cat?.title || item.widgetKey;
        return (
          <div key={item.widgetKey}>
            <WidgetFrame
              title={title}
              editing={editing}
              configurable={item.widgetKey !== "marketplace-stats"}
              onConfigure={() => onConfigure(item.widgetKey)}
              onRemove={() => onRemove(item.widgetKey)}
            >
              {renderWidget(registry, item, settings, {
                editing,
                updateSetting: (key, value) => onUpdateSetting?.(item.widgetKey, key, value),
                openSettings: (sectionKey) => onConfigure(item.widgetKey, sectionKey),
              })}
            </WidgetFrame>
          </div>
        );
      })}
    </Grid>
  );
}
