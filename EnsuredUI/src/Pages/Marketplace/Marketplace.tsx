import React, { useMemo, useState } from 'react';
import { Main, Page } from './Marketplace.styles';
import {
  MarketplaceBodyLayout,
  MarketplaceDealsSection,
  MarketplaceFiltersSection,
  MarketplaceFooterSection,
  MarketplaceMapSection,
  MarketplaceSectionHead,
  MarketplaceStatsSection,
} from './Marketplace.sections';
import {
  useAggregatedDeals,
  useLiveRiskEvents,
  useMarketplaceLineOfBusinessTaxonomy,
  useMarketplaceMapPoints,
  useMarketplaceOpportunities,
  useMarketplaceSummary,
} from './useMarketplaceData';
import {
  applyMarketplaceFilters,
  useMarketplaceViewState,
} from './useMarketplaceFilters';
import { toMarketplaceTableRows } from './Marketplace.utils';
import { MAP_LAYERS } from '../../xds/components/mapLayers';

export default function MarketplacePage() {
  const {
    opportunities,
    isLoadingOpportunities,
    opportunitiesError,
    lastUpdated,
  } = useMarketplaceOpportunities();
  const { primaryTypes, isLoadingTaxonomy, taxonomyError } =
    useMarketplaceLineOfBusinessTaxonomy();
  const events = useLiveRiskEvents();

  // One filter/sort/view state (URL-synced) drives the deals list, the stat
  // cards and the map markers alike.
  const view = useMarketplaceViewState(primaryTypes);

  const filteredOpportunities = useMemo(
    () =>
      applyMarketplaceFilters(
        opportunities,
        primaryTypes,
        view.filters,
        view.sort,
        view.taxonomyApplied
      ),
    [opportunities, primaryTypes, view.filters, view.sort, view.taxonomyApplied]
  );

  const summary = useMarketplaceSummary(filteredOpportunities);
  // Footer shows marketplace-wide truth, independent of the current filters.
  const overallSummary = useMarketplaceSummary(opportunities);
  const deals = useAggregatedDeals(filteredOpportunities);
  const mapPoints = useMarketplaceMapPoints(filteredOpportunities);
  const tableRows = useMemo(
    () => toMarketplaceTableRows(filteredOpportunities),
    [filteredOpportunities]
  );

  // Map layer state lives at page level so the filter rail and the map panel
  // share it.
  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultEnabled]))
  );
  const [layerFacets, setLayerFacets] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      MAP_LAYERS.filter((l) => l.filter).map((l) => [
        l.id,
        l.filter!.options.map((o) => o.value),
      ])
    )
  );
  const [layerCounts, setLayerCounts] = useState<Record<string, number | null>>(
    {}
  );
  const [is3D, setIs3D] = useState(false);
  const [highlightedDealId, setHighlightedDealId] = useState<string | null>(
    null
  );

  const toggleLayer = (layerId: string) =>
    setLayersEnabled((prev) => ({ ...prev, [layerId]: !prev[layerId] }));

  const toggleLayerFacet = (layerId: string, value: string) =>
    setLayerFacets((prev) => {
      const current = prev[layerId] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [layerId]: next };
    });

  const mapLayerControls = {
    layersEnabled,
    onToggleLayer: toggleLayer,
    layerFacets,
    onToggleLayerFacet: toggleLayerFacet,
    layerCounts,
    is3D,
    onToggle3D: () => setIs3D((s) => !s),
  };

  return (
    <Page>
      <Main>
        <MarketplaceStatsSection summary={summary} />
        <MarketplaceSectionHead
          viewMode={view.viewMode}
          onViewModeChange={view.setViewMode}
          sort={view.sort}
          onSortChange={view.setSort}
          showMap={view.showMap}
          onToggleMap={() => view.setShowMap(!view.showMap)}
          lastUpdated={lastUpdated}
        />
        <MarketplaceBodyLayout
          filters={
            <MarketplaceFiltersSection
              primaryTypes={primaryTypes}
              isLoadingTaxonomy={isLoadingTaxonomy}
              taxonomyError={taxonomyError}
              selectedLineOfBusiness={view.filters.selectedLineOfBusiness}
              onSelectedLineOfBusinessChange={view.setSelectedLineOfBusiness}
              selectedSubTypes={view.filters.selectedSubTypes}
              onSelectedSubTypesChange={view.setSelectedSubTypes}
              maxDurationMonths={view.filters.maxDurationMonths}
              onMaxDurationChange={view.setMaxDurationMonths}
              yieldMin={view.filters.yieldMin}
              onYieldMinChange={view.setYieldMin}
              yieldMax={view.filters.yieldMax}
              onYieldMaxChange={view.setYieldMax}
              showMap={view.showMap}
              mapLayers={mapLayerControls}
              events={events}
            />
          }
          deals={
            <>
              {view.showMap ? (
                <MarketplaceMapSection
                  mapPoints={mapPoints}
                  onPointClick={setHighlightedDealId}
                  layers={{
                    ...mapLayerControls,
                    onLayerCounts: setLayerCounts,
                  }}
                />
              ) : null}
              <MarketplaceDealsSection
                viewMode={view.viewMode}
                isLoading={isLoadingOpportunities}
                error={opportunitiesError}
                opportunities={filteredOpportunities}
                totalOpportunityCount={opportunities.length}
                deals={deals}
                tableRows={tableRows}
                highlightedDealId={highlightedDealId}
              />
            </>
          }
        />
      </Main>
      <MarketplaceFooterSection
        events={events}
        totalOpenCapacity={overallSummary.totalOpenCapacity}
        activeTranches={opportunities.length}
      />
    </Page>
  );
}
