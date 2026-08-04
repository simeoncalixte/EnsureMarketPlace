import React from "react";
import { AddPanel, AddChip, Empty, PresetLabel } from "../xds/components/DashboardHost";
import type { CatalogWidget, MetricPreset } from "./types";

type Props = {
  addable: CatalogWidget[];
  presets: MetricPreset[];
  onAddWidget: (cat: CatalogWidget) => void;
  onAddPreset: (p: MetricPreset) => void;
};

export default function DashboardAddPanel({ addable, presets, onAddWidget, onAddPreset }: Props) {
  return (
    <AddPanel>
      {addable.map((c) => (
        <AddChip key={c.widgetKey} type="button" onClick={() => onAddWidget(c)}>
          + {c.title}
        </AddChip>
      ))}
      {presets.length > 0 && (
        <>
          <PresetLabel>Predefined metrics</PresetLabel>
          {presets.map((p) => (
            <AddChip key={p.id} type="button" onClick={() => onAddPreset(p)}>
              + {p.title}
            </AddChip>
          ))}
        </>
      )}
      {!addable.length && presets.length === 0 && <Empty>All widgets are placed.</Empty>}
    </AddPanel>
  );
}
