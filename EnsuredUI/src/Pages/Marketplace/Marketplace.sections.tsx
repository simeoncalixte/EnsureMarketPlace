import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapPanel from '../../xds/components/MapPanel';
import DataTable, { type Row as DataTableRow } from '../../xds/components/DataTable';
import StatCard from '../../xds/components/StatCard';
import Badge from '../../xds/components/Badge';
import Button from '../../xds/components/Button';
import Input from '../../xds/components/Input';
import Checkbox from '../../xds/components/Checkbox';
import ProgressBar from '../../xds/components/ProgressBar';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import MultiSelect from '../../xds/components/MultiSelect';
import Range from '../../xds/components/Range';
import {
  Footer,
  FooterLink,
  DealGrid,
  StatsSection,
  StatCardSurface,
  StatNoteRow,
  MarketplaceBody,
  FilterBar,
  FilterField,
  FilterFieldNarrow,
  FilterFieldLabel,
  FilterBarTrailing,
  FilterTwoColGrid,
  RangeLabels,
  SignalCard,
  SignalTitle,
  SignalText,
  SectionHead,
  SectionTitle,
  UpdatedStamp,
  HeadControls,
  CardsGrid,
  TableScroll,
  MapSectionWrap,
  DealCardSurface,
  AccentBarPrimary,
  AccentBarTertiary,
  CardBody,
  CardTitle,
  CardSub,
  FooterStatus,
  FooterStrong,
  FooterLinks,
  PulseRow,
  PulseDot,
  TickerViewport,
  TickerTrack,
  TickerItem,
  TickerDot,
  FooterStat,
  AggregatedCardsStack,
  AggregatedDealCard,
  AggregatedAccentBar,
  AggregatedCardInner,
  AggregatedDealHeader,
  AggregatedDealMeta,
  AggregatedBadgeRow,
  AggregatedDealReference,
  AggregatedDealTitle,
  AggregatedDealDescription,
  AggregatedSummary,
  AggregatedSummaryMetric,
  AggregatedSummaryLabel,
  AggregatedSummaryValue,
  AggregatedTrancheTable,
  AggregatedTrancheHeader,
  AggregatedTrancheHeaderCenter,
  AggregatedTrancheHeaderRight,
  AggregatedTrancheRow,
  AggregatedTrancheMain,
  AggregatedTrancheTitle,
  AggregatedTrancheCaption,
  AggregatedMetricCell,
  AggregatedMetricLabel,
  AggregatedRiskScore,
  AggregatedYieldValue,
  AggregatedFundedCell,
  AggregatedFundedBarWrap,
  AggregatedFundedValue,
  AggregatedActionCell,
  AggregatedAllocateButton,
  AggregatedFooter,
  AggregatedFooterAction,
} from './Marketplace.styles';
import type {
  AggregatedDeal,
  LineOfBusinessPrimaryType,
  LiveRiskEvent,
  MarketplaceOpportunity,
} from './useMarketplaceData';
import {
  primaryTypeKey,
  subTypeKey,
  DURATION_MONTHS_MAX,
  DURATION_MONTHS_MIN,
  type MarketplaceSort,
  type MarketplaceViewMode,
} from './useMarketplaceFilters';
import { colors } from '../../xds/colors';
import {
  cleanDealName,
  dealBadgeLabel,
  dealTone,
  formatDealReference,
  formatPct,
  formatShortCurrency,
  riskPresentation,
  toCompactParts,
  trancheCaption,
  trancheTone,
} from './Marketplace.utils';

type Summary = {
  totalOpenCapacity: number;
  totalFunded: number;
  activeDeals: number;
};

const toneToBadgeVariant = (
  tone: 'primary' | 'secondary' | 'tertiary'
): 'primary' | 'secondary' | 'tertiary' => tone;

export function MarketplaceStatsSection({ summary }: { summary: Summary }) {
  const openCapacity = toCompactParts(summary.totalOpenCapacity);
  const totalFunded = toCompactParts(summary.totalFunded);

  return (
    <StatsSection>
      <StatCardSurface $tone="primary">
        <StatCard
          label="Total Open Capacity"
          currencyPrefix="$"
          value={openCapacity.value}
          suffix={openCapacity.suffix}
          tone="info"
          note={
            <StatNoteRow>
              <span className="material-symbols-outlined">trending_up</span>
              Live Pending Funding Capacity
            </StatNoteRow>
          }
        />
      </StatCardSurface>
      <StatCardSurface $tone="secondary">
        <StatCard
          label="Total Funded"
          currencyPrefix="$"
          value={totalFunded.value}
          suffix={totalFunded.suffix}
          tone="default"
          note={
            <StatNoteRow>
              <span className="material-symbols-outlined">history</span>
              Funding Already Committed
            </StatNoteRow>
          }
        />
      </StatCardSurface>
      <StatCardSurface $tone="tertiary">
        <StatCard
          label="Active Deals"
          value={String(summary.activeDeals)}
          tone="default"
          note={
            <StatNoteRow>
              <span className="material-symbols-outlined">pending_actions</span>
              Active Opportunities Pending Funding
            </StatNoteRow>
          }
        />
      </StatCardSurface>
    </StatsSection>
  );
}

const VIEW_MODE_OPTIONS = [
  { label: 'Aggregated', value: 'aggregated' },
  { label: 'Table', value: 'table' },
];

const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' },
  { label: 'Top Yield', value: 'yield' },
];

function formatUpdatedTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Single page header: title + freshness stamp on the left, all view controls on the right. */
export function MarketplaceSectionHead({
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  showMap,
  onToggleMap,
  lastUpdated,
}: {
  viewMode: MarketplaceViewMode;
  onViewModeChange: (mode: MarketplaceViewMode) => void;
  sort: MarketplaceSort;
  onSortChange: (sort: MarketplaceSort) => void;
  showMap: boolean;
  onToggleMap: () => void;
  lastUpdated: Date | null;
}) {
  return (
    <SectionHead>
      <SectionTitle>Deal Inventory</SectionTitle>
      {lastUpdated ? (
        <UpdatedStamp>Updated {formatUpdatedTime(lastUpdated)}</UpdatedStamp>
      ) : null}
      <HeadControls>
        <SegmentedSwitch
          aria-label="Sort order"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value: string) => onSortChange(value as MarketplaceSort)}
        />
        <SegmentedSwitch
          aria-label="View mode"
          options={VIEW_MODE_OPTIONS}
          value={viewMode}
          onChange={(value: string) => onViewModeChange(value as MarketplaceViewMode)}
        />
        <Button variant="outline" size="sm" onClick={onToggleMap}>
          <span className="material-symbols-outlined">map</span>
          {showMap ? 'Hide Map' : 'Show Map'}
        </Button>
      </HeadControls>
    </SectionHead>
  );
}

export type MapLayerControlProps = {
  layersEnabled: Record<string, boolean>;
  onToggleLayer: (layerId: string) => void;
  layerFacets: Record<string, string[]>;
  onToggleLayerFacet: (layerId: string, value: string) => void;
  layerCounts: Record<string, number | null>;
  is3D: boolean;
  onToggle3D: () => void;
};

/**
 * Supporting geographic context for the deal list. The layer + facet controls
 * ride on the map's own toolbar; the page drives them as controlled props so
 * markers and toolbar stay in sync. (The 3D toggle lives in the filter bar.)
 */
export function MarketplaceMapSection({
  mapPoints,
  onPointClick,
  layers,
}: {
  mapPoints: Array<{ latitude: number; longitude: number; label?: string; id?: string }>;
  onPointClick: (dealId: string) => void;
  layers: MapLayerControlProps & {
    onLayerCounts: (counts: Record<string, number | null>) => void;
  };
}) {
  return (
    <MapSectionWrap>
      <MapPanel
        points={mapPoints}
        onPointClick={onPointClick}
        showLayerBar
        layersEnabled={layers.layersEnabled}
        onToggleLayer={layers.onToggleLayer}
        layerFacets={layers.layerFacets}
        onToggleLayerFacet={layers.onToggleLayerFacet}
        is3D={layers.is3D}
        onLayerCounts={layers.onLayerCounts}
      />
    </MapSectionWrap>
  );
}

/** Vertical page body: the horizontal filter bar above the market data. */
export function MarketplaceBodyLayout({
  filters,
  deals,
}: {
  filters: React.ReactNode;
  deals: React.ReactNode;
}) {
  return (
    <MarketplaceBody>
      {filters}
      {deals}
    </MarketplaceBody>
  );
}

// Highest-severity live event first; used to pick the market-signal headline.
const SEVERITY_RANK: Record<string, number> = {
  severe: 3,
  high: 2,
  moderate: 1,
  low: 0,
};

export function MarketplaceFiltersSection({
  primaryTypes,
  isLoadingTaxonomy,
  taxonomyError,
  selectedLineOfBusiness,
  onSelectedLineOfBusinessChange,
  selectedSubTypes,
  onSelectedSubTypesChange,
  maxDurationMonths,
  onMaxDurationChange,
  yieldMin,
  onYieldMinChange,
  yieldMax,
  onYieldMaxChange,
  showMap,
  mapLayers,
  events,
}: {
  primaryTypes: LineOfBusinessPrimaryType[];
  isLoadingTaxonomy: boolean;
  taxonomyError: string | null;
  selectedLineOfBusiness: Set<string>;
  onSelectedLineOfBusinessChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedSubTypes: Set<string>;
  onSelectedSubTypesChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  maxDurationMonths: number;
  onMaxDurationChange: (months: number) => void;
  yieldMin: string;
  onYieldMinChange: (value: string) => void;
  yieldMax: string;
  onYieldMaxChange: (value: string) => void;
  showMap: boolean;
  mapLayers: MapLayerControlProps;
  events: LiveRiskEvent[];
}) {
  const lineOfBusinessOptions = useMemo(
    () =>
      primaryTypes.map((primaryType) => ({
        value: primaryTypeKey(primaryType),
        label: primaryType.label,
      })),
    [primaryTypes]
  );

  const subTypeOptions = useMemo(
    () =>
      primaryTypes.flatMap((primaryType) =>
        primaryType.subTypes.map((subType) => ({
          value: subTypeKey(primaryType, subType),
          label: `${primaryType.label} - ${subType.label}`,
        }))
      ),
    [primaryTypes]
  );

  const toggleSelection = (
    onChange: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string
  ) => {
    onChange((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const addValues = (
    onChange: React.Dispatch<React.SetStateAction<Set<string>>>,
    values: string[]
  ) => {
    onChange((prev) => new Set([...prev, ...values]));
  };

  const removeValues = (
    onChange: React.Dispatch<React.SetStateAction<Set<string>>>,
    values: string[]
  ) => {
    onChange((prev) => {
      const next = new Set(prev);
      for (const value of values) {
        next.delete(value);
      }
      return next;
    });
  };

  const topEvent = useMemo(() => {
    if (events.length === 0) {
      return null;
    }
    return [...events].sort(
      (a, b) =>
        (SEVERITY_RANK[b.severityLevel ?? ''] ?? -1) -
        (SEVERITY_RANK[a.severityLevel ?? ''] ?? -1)
    )[0];
  }, [events]);

  return (
    <FilterBar>
      <FilterField>
        <FilterFieldLabel>Line of Business</FilterFieldLabel>
        <MultiSelect
          label="Line of Business"
          placeholder="Any line of business"
          searchPlaceholder="Search line of business…"
          options={lineOfBusinessOptions}
          selected={selectedLineOfBusiness}
          onToggle={(value) =>
            toggleSelection(onSelectedLineOfBusinessChange, value)
          }
          onSelectAll={(values) =>
            addValues(onSelectedLineOfBusinessChange, values)
          }
          onClear={(values) =>
            removeValues(onSelectedLineOfBusinessChange, values)
          }
          isLoading={isLoadingTaxonomy}
          error={taxonomyError}
          loadingText="Loading line of business values…"
          emptyText="No line of business metadata available."
          noMatchText="No line of business matches your search."
        />
      </FilterField>

      <FilterField>
        <FilterFieldLabel>Sub Types</FilterFieldLabel>
        <MultiSelect
          label="Sub Types"
          placeholder="Any sub type"
          searchPlaceholder="Search sub types…"
          options={subTypeOptions}
          selected={selectedSubTypes}
          onToggle={(value) => toggleSelection(onSelectedSubTypesChange, value)}
          onSelectAll={(values) => addValues(onSelectedSubTypesChange, values)}
          onClear={(values) => removeValues(onSelectedSubTypesChange, values)}
          isLoading={isLoadingTaxonomy}
          error={taxonomyError}
          loadingText="Loading subtype values…"
          emptyText="No subtype metadata available."
          noMatchText="No subtype matches your search."
        />
      </FilterField>

      <FilterFieldNarrow>
        <FilterFieldLabel>
          Max Duration ·{' '}
          {maxDurationMonths >= DURATION_MONTHS_MAX
            ? 'Any'
            : `${maxDurationMonths}M`}
        </FilterFieldLabel>
        <Range
          min={DURATION_MONTHS_MIN}
          max={DURATION_MONTHS_MAX}
          step={1}
          value={maxDurationMonths}
          onChange={(event) => onMaxDurationChange(Number(event.target.value))}
          aria-label="Maximum duration in months"
        />
        <RangeLabels>
          <span>3M</span>
          <span>12M</span>
          <span>24M</span>
          <span>36M</span>
        </RangeLabels>
      </FilterFieldNarrow>

      <FilterFieldNarrow>
        <FilterFieldLabel>Expected Yield (%)</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input
            placeholder="Min"
            type="number"
            inputMode="decimal"
            value={yieldMin}
            onChange={(event) => onYieldMinChange(event.target.value)}
            aria-label="Minimum expected yield"
          />
          <Input
            placeholder="Max"
            type="number"
            inputMode="decimal"
            value={yieldMax}
            onChange={(event) => onYieldMaxChange(event.target.value)}
            aria-label="Maximum expected yield"
          />
        </FilterTwoColGrid>
      </FilterFieldNarrow>

      {showMap || topEvent ? (
        <FilterBarTrailing>
          {showMap ? (
            <Checkbox
              label="3D Buildings"
              checked={mapLayers.is3D}
              onChange={mapLayers.onToggle3D}
            />
          ) : null}
        </FilterBarTrailing>
      ) : null}
    </FilterBar>
  );
}

function MarketplaceStateCard({
  title,
  subtitle,
  isError,
}: {
  title: string;
  subtitle: string;
  isError?: boolean;
}) {
  return (
    <DealCardSurface>
      {isError ? <AccentBarTertiary /> : <AccentBarPrimary />}
      <CardBody>
        <CardTitle>{title}</CardTitle>
        <CardSub>{subtitle}</CardSub>
      </CardBody>
    </DealCardSurface>
  );
}

function MarketplaceAggregatedDeals({
  deals,
  highlightedDealId,
}: {
  deals: AggregatedDeal[];
  highlightedDealId: string | null;
}) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // A map-marker click hands us a deal id; bring its card into view.
  useEffect(() => {
    if (!highlightedDealId) {
      return;
    }
    cardRefs.current[highlightedDealId]?.scrollIntoView({ block: 'center' });
  }, [highlightedDealId]);

  return (
    <AggregatedCardsStack>
      {deals.map((deal) => {
        const tone = dealTone(deal.tranches);
        const dealKey = String(deal.dealId);

        return (
          <AggregatedDealCard
            key={deal.dealId}
            ref={(el: HTMLDivElement | null) => {
              cardRefs.current[dealKey] = el;
            }}
            $highlighted={highlightedDealId === dealKey}
          >
            <AggregatedAccentBar $tone={tone} />
            <AggregatedCardInner>
              <AggregatedDealHeader>
                <AggregatedDealMeta>
                  <AggregatedBadgeRow>
                    <Badge variant={toneToBadgeVariant(tone)}>
                      {dealBadgeLabel(deal.tranches)}
                    </Badge>
                    <AggregatedDealReference>
                      {formatDealReference(deal)}
                    </AggregatedDealReference>
                  </AggregatedBadgeRow>
                  <AggregatedDealTitle>
                    {cleanDealName(deal.dealName)}
                  </AggregatedDealTitle>
                  <AggregatedDealDescription>
                    {deal.dealStatus
                      ? `${deal.dealStatus.charAt(0).toUpperCase()}${deal.dealStatus.slice(1)}. `
                      : ''}
                    {deal.tranches.length} tranche
                    {deal.tranches.length === 1 ? '' : 's'} currently open for
                    allocation.
                  </AggregatedDealDescription>
                </AggregatedDealMeta>

                <AggregatedSummary>
                  <AggregatedSummaryMetric>
                    <AggregatedSummaryLabel>Total Deal Size</AggregatedSummaryLabel>
                    <AggregatedSummaryValue>
                      {formatShortCurrency(deal.totalDealSize)}
                    </AggregatedSummaryValue>
                  </AggregatedSummaryMetric>
                  <AggregatedSummaryMetric>
                    <AggregatedSummaryLabel>Duration</AggregatedSummaryLabel>
                    <AggregatedSummaryValue>
                      {deal.durationMonths || 0} Mo
                    </AggregatedSummaryValue>
                  </AggregatedSummaryMetric>
                </AggregatedSummary>
              </AggregatedDealHeader>

              <AggregatedTrancheTable>
                <AggregatedTrancheHeader>
                  <div>Tranche Class</div>
                  <AggregatedTrancheHeaderCenter>Risk Level</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderCenter>Exp. Yield</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderCenter>Funded</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderRight>Action</AggregatedTrancheHeaderRight>
                </AggregatedTrancheHeader>

                {deal.tranches.map((tranche) => {
                  const risk = riskPresentation(tranche.riskLevel);
                  const toneForTranche = trancheTone(tranche.riskLevel);
                  const caption = trancheCaption(tranche);
                  const progress = Math.max(
                    0,
                    Math.min(100, tranche.fundingProgressPct)
                  );
                  const barTone =
                    toneForTranche === 'secondary'
                      ? 'gain'
                      : toneForTranche === 'tertiary'
                      ? 'tertiary'
                      : 'primary';

                  return (
                    <AggregatedTrancheRow key={tranche.id}>
                      <AggregatedTrancheMain>
                        <AggregatedTrancheTitle>
                          {tranche.trancheName}
                        </AggregatedTrancheTitle>
                        {caption ? (
                          <AggregatedTrancheCaption>
                            {caption}
                          </AggregatedTrancheCaption>
                        ) : null}
                      </AggregatedTrancheMain>

                      <AggregatedMetricCell>
                        <AggregatedMetricLabel>Risk Level</AggregatedMetricLabel>
                        <AggregatedRiskScore $tone={toneForTranche}>
                          {risk.score}
                        </AggregatedRiskScore>
                      </AggregatedMetricCell>

                      <AggregatedMetricCell>
                        <AggregatedMetricLabel>Exp. Yield</AggregatedMetricLabel>
                        <AggregatedYieldValue $tone={toneForTranche}>
                          {formatPct(tranche.expectedReturnPct)}
                        </AggregatedYieldValue>
                      </AggregatedMetricCell>

                      <AggregatedFundedCell>
                        <AggregatedMetricLabel>Funded</AggregatedMetricLabel>
                        <AggregatedFundedBarWrap>
                          <ProgressBar value={progress} tone={barTone} size="sm" />
                        </AggregatedFundedBarWrap>
                        <AggregatedFundedValue>
                          {Math.round(progress)}%
                        </AggregatedFundedValue>
                      </AggregatedFundedCell>

                      <AggregatedActionCell>
                        <AggregatedAllocateButton>Allocate</AggregatedAllocateButton>
                      </AggregatedActionCell>
                    </AggregatedTrancheRow>
                  );
                })}
              </AggregatedTrancheTable>

              <AggregatedFooter>
                <AggregatedFooterAction>
                  <span className="material-symbols-outlined">
                    description
                  </span>
                  View Prospectus
                </AggregatedFooterAction>
                <AggregatedFooterAction>
                  <span className="material-symbols-outlined">
                    visibility
                  </span>
                  Risk Model
                </AggregatedFooterAction>
              </AggregatedFooter>
            </AggregatedCardInner>
          </AggregatedDealCard>
        );
      })}
    </AggregatedCardsStack>
  );
}

function MarketplaceTableSection({ rows }: { rows: DataTableRow[] }) {
  return (
    <CardsGrid>
      <TableScroll>
        <DataTable rows={rows} />
      </TableScroll>
    </CardsGrid>
  );
}

export function MarketplaceDealsSection({
  viewMode,
  isLoading,
  error,
  opportunities,
  totalOpportunityCount,
  deals,
  tableRows,
  highlightedDealId,
}: {
  viewMode: MarketplaceViewMode;
  isLoading: boolean;
  error: string | null;
  opportunities: MarketplaceOpportunity[];
  /** Unfiltered count, to distinguish "nothing matches" from "nothing exists". */
  totalOpportunityCount: number;
  deals: AggregatedDeal[];
  tableRows: DataTableRow[];
  highlightedDealId: string | null;
}) {
  const hasNoData = opportunities.length === 0;
  const isFilteredOut = hasNoData && totalOpportunityCount > 0;

  return (
    <DealGrid>
      {isLoading ? (
        <MarketplaceStateCard
          title="Loading opportunities..."
          subtitle="Pulling live active opportunities pending funding from the API."
        />
      ) : error ? (
        <MarketplaceStateCard
          title="Unable to load opportunities"
          subtitle={error}
          isError
        />
      ) : isFilteredOut ? (
        <MarketplaceStateCard
          title="No deals match the current filters"
          subtitle="Loosen the line-of-business, duration or yield filters to see more opportunities."
        />
      ) : hasNoData ? (
        <MarketplaceStateCard
          title="No pending opportunities"
          subtitle="All active opportunities are currently fully funded."
        />
      ) : viewMode === 'table' ? (
        <MarketplaceTableSection rows={tableRows} />
      ) : (
        <MarketplaceAggregatedDeals
          deals={deals}
          highlightedDealId={highlightedDealId}
        />
      )}
    </DealGrid>
  );
}

// Severity ramp shared with the map's active-events layer.
const TICKER_SEVERITY_COLOR: Record<string, string> = {
  severe: colors.dataViz.red,
  high: colors.dataViz.orange,
  moderate: colors.dataViz.amber,
  low: colors.dataViz.green,
};

function formatTickerEvent(e: LiveRiskEvent): string {
  const peril = e.peril ? `${e.peril.toUpperCase()}: ` : '';
  const place = e.place ? ` — ${e.place}` : '';
  return `${peril}${e.title ?? 'Event'}${place}`;
}

export function MarketplaceFooterSection({
  events,
  totalOpenCapacity,
  activeTranches,
}: {
  events: LiveRiskEvent[];
  totalOpenCapacity: number;
  activeTranches: number;
}) {
  return (
    <Footer>
      <FooterStatus>
        <PulseRow>
          <PulseDot />
          {events.length === 0 && 'Monitoring global risk feed…'}
        </PulseRow>
        {events.length > 0 && (
          <TickerViewport>
            {/* Duplicated list so the marquee loops seamlessly at translateX(-50%). */}
            <TickerTrack>
              {[...events, ...events].map((e, i) => (
                <TickerItem key={i} aria-hidden={i >= events.length}>
                  <TickerDot $color={TICKER_SEVERITY_COLOR[e.severityLevel ?? ''] ?? colors.dataViz.mint} />
                  {formatTickerEvent(e)}
                </TickerItem>
              ))}
            </TickerTrack>
          </TickerViewport>
        )}
        <FooterStat>
          Open Capacity: <FooterStrong>{formatShortCurrency(totalOpenCapacity)}</FooterStrong>
        </FooterStat>
        <FooterStat>
          Active Tranches: <FooterStrong>{activeTranches}</FooterStrong>
        </FooterStat>
      </FooterStatus>
      <FooterLinks>
        <FooterLink href="#">Network Status</FooterLink>
        <FooterLink href="#">Risk Feed</FooterLink>
        <FooterLink href="#">Documentation</FooterLink>
      </FooterLinks>
    </Footer>
  );
}
