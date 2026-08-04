import React from "react";
import MultiSelect from "../../../xds/components/MultiSelect";
import Button from "../../../xds/components/Button";
import {
  FilterDock,
  DockHead,
  DockTitle,
  DockClose,
  FilterSectionsWrap,
  DockField,
  DockActions,
  ChipClearAll,
  FilterFieldLabel,
} from "../Marketplace.styles";
import FilterRenderer, { type FiltersConfig } from "./FilterRenderer";

// Section UI and disabled-field implementations moved to dedicated files.

export type MarketplaceFilterDockProps = {
  filtersConfig: FiltersConfig;
  filterValues?: Record<string, unknown>;
  preloadedData?: Record<string, Array<{ value: string; label: string }>>;
  customSlots?: Record<string, React.ReactNode>;
  onFilterValuesChange?: (state: Record<string, unknown>) => void;
  mapLayerOptions: Array<{ value: string; label: string }>;
  selectedLayers: Set<string>;
  onToggleLayer: (value: string) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
};

export default function MarketplaceFilterDock({
  filtersConfig,
  filterValues,
  preloadedData,
  customSlots,
  onFilterValuesChange,
  mapLayerOptions,
  selectedLayers,
  onToggleLayer,
  onClose,
  onReset,
  onApply,
}: MarketplaceFilterDockProps) {
  return (
    <FilterDock>
      <DockHead>
        <DockTitle>Filters</DockTitle>
        <DockClose type="button" onClick={onClose} aria-label="Close filters">
          <span className="material-symbols-outlined">close</span>
        </DockClose>
      </DockHead>

      <FilterSectionsWrap>
        <FilterRenderer
          config={filtersConfig}
          value={filterValues}
          preloadedData={preloadedData}
          slots={customSlots}
          onChange={onFilterValuesChange}
        />
      </FilterSectionsWrap>

      {/* Map display (not a deal filter) — which overlays are drawn. */}
      <DockField>
        <FilterFieldLabel>Map layers</FilterFieldLabel>
        <MultiSelect
          label="Map layers"
          placeholder="No layers"
          searchPlaceholder="Search layers…"
          options={mapLayerOptions}
          selected={selectedLayers}
          onToggle={onToggleLayer}
          emptyText="No map layers available."
          noMatchText="No layer matches your search."
        />
      </DockField>

      <DockActions>
        <ChipClearAll type="button" onClick={onReset}>
          Reset
        </ChipClearAll>
        <Button variant="primary" size="sm" onClick={onApply}>
          Apply
        </Button>
      </DockActions>
    </FilterDock>
  );
}
