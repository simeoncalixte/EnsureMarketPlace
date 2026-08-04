import React from 'react';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import {
  ExplorerToolbar,
  ToolbarTitle,
  ToolbarTitleCount,
  ToolbarControls,
  ToolbarSearch,
  ToolbarSearchInput,
  FiltersToggle,
  CountPill,
} from './Marketplace.styles';
import type { MarketplaceSort, MarketplaceCanvasView } from './useMarketplaceFilters';

const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' },
  { label: 'Top Yield', value: 'yield' },
];

const CANVAS_OPTIONS = [
  { label: 'Map', value: 'map' },
  { label: 'List', value: 'list' },
  { label: 'Split', value: 'split' },
];

export function MarketplaceExplorerToolbar({
  dealCount,
  query,
  onQueryChange,
  sort,
  onSortChange,
  canvasView,
  onCanvasViewChange,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
}: {
  dealCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  sort: MarketplaceSort;
  onSortChange: (sort: MarketplaceSort) => void;
  canvasView: MarketplaceCanvasView;
  onCanvasViewChange: (view: MarketplaceCanvasView) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}) {
  return (
    <ExplorerToolbar>
      <ToolbarTitle>
        Deal inventory <ToolbarTitleCount>· {dealCount}</ToolbarTitleCount>
      </ToolbarTitle>
      <ToolbarControls>
        <ToolbarSearch>
          <span className="material-symbols-outlined">search</span>
          <ToolbarSearchInput
            type="search"
            placeholder="Search deals"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search deals"
          />
        </ToolbarSearch>
        <SegmentedSwitch
          aria-label="Sort order"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value: string) => onSortChange(value as MarketplaceSort)}
        />
        <SegmentedSwitch
          aria-label="Canvas view"
          options={CANVAS_OPTIONS}
          value={canvasView}
          onChange={(value: string) => onCanvasViewChange(value as MarketplaceCanvasView)}
        />
        <FiltersToggle
          type="button"
          $active={filtersOpen}
          onClick={onToggleFilters}
          aria-pressed={filtersOpen}
        >
          <span className="material-symbols-outlined">tune</span>
          Filters
          {activeFilterCount > 0 ? <CountPill>{activeFilterCount}</CountPill> : null}
        </FiltersToggle>
      </ToolbarControls>
    </ExplorerToolbar>
  );
}

export default MarketplaceExplorerToolbar;
