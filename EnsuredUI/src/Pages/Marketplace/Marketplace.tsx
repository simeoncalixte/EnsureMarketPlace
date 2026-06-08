import React, { useMemo, useState } from 'react';
import { Main, Page } from './Marketplace.styles';
import {
  MarketplaceBodyLayout,
  MarketplaceDealsSection,
  MarketplaceFiltersSection,
  MarketplaceFooterSection,
  MarketplaceMapSection,
  MarketplaceStatsSection,
  MarketplaceViewToggle,
  type MarketplaceSectionView,
  type MarketplaceViewMode,
} from './Marketplace.sections';
import {
  useAggregatedDeals,
  useMarketplaceLineOfBusinessTaxonomy,
  useMarketplaceMapPoints,
  useMarketplaceOpportunities,
  useMarketplaceSummary,
} from './useMarketplaceData';
import { toMarketplaceTableRows } from './Marketplace.utils';

export default function MarketplacePage() {
  // Top-level toggle: show the map section OR the marketplace deal section (filters + listing).
  const [sectionView, setSectionView] = useState<MarketplaceSectionView>('map');
  const [viewMode, setViewMode] = useState<MarketplaceViewMode>('aggregated');
  const { opportunities, isLoadingOpportunities, opportunitiesError } =
    useMarketplaceOpportunities();
  const summary = useMarketplaceSummary(opportunities);
  const deals = useAggregatedDeals(opportunities);
  const mapPoints = useMarketplaceMapPoints(opportunities);
  const { primaryTypes, isLoadingTaxonomy, taxonomyError } =
    useMarketplaceLineOfBusinessTaxonomy();
  const tableRows = useMemo(
    () => toMarketplaceTableRows(opportunities),
    [opportunities]
  );

  return (
    <Page>
      <Main>
        <MarketplaceStatsSection summary={summary} />
        <MarketplaceViewToggle view={sectionView} onChange={setSectionView} />
        {sectionView === 'map' ? (
          <MarketplaceMapSection
            dealsCount={deals.length}
            totalOpenCapacity={summary.totalOpenCapacity}
            mapPoints={mapPoints}
          />
        ) : (
          <MarketplaceBodyLayout
            filters={
              <MarketplaceFiltersSection
                primaryTypes={primaryTypes}
                isLoadingTaxonomy={isLoadingTaxonomy}
                taxonomyError={taxonomyError}
              />
            }
            deals={
              <MarketplaceDealsSection
                viewMode={viewMode}
                setViewMode={setViewMode}
                isLoading={isLoadingOpportunities}
                error={opportunitiesError}
                opportunities={opportunities}
                deals={deals}
                tableRows={tableRows}
              />
            }
          />
        )}
      </Main>
      <MarketplaceFooterSection />
    </Page>
  );
}
