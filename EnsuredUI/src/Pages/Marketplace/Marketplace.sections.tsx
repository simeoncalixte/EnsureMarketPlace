import React, { useEffect, useMemo, useState } from 'react';
import MapPanel from '../../xds/components/MapPanel';
import DataTable, { type Row as DataTableRow } from '../../xds/components/DataTable';
import StatCard from '../../xds/components/StatCard';
import Badge from '../../xds/components/Badge';
import Button from '../../xds/components/Button';
import Input from '../../xds/components/Input';
import Checkbox from '../../xds/components/Checkbox';
import ProgressBar from '../../xds/components/ProgressBar';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import CollapsibleSection from '../../xds/components/CollapsibleSection';
import Range from '../../xds/components/Range';
import {
  Footer,
  FooterLink,
  DealGrid,
  StatsSection,
  StatCardSurface,
  StatNoteRow,
  FiltersAside,
  FilterHeading,
  FilterStack,
  FilterFieldStack,
  FilterTwoColGrid,
  CheckboxFilterScroll,
  CheckboxFilterItems,
  CheckboxFilterMessage,
  CheckboxFilterFooter,
  CheckboxFilterCount,
  CheckboxFilterActions,
  RangeLabels,
  SignalCard,
  SignalTitle,
  SignalText,
  SectionHead,
  SectionTitle,
  SortControls,
  ViewModeControls,
  CardsGrid,
  TableScroll,
  MapSectionWrap,
  DealCardSurface,
  AccentBarPrimary,
  AccentBarTertiary,
  CardBody,
  CardTop,
  CardBadgeRow,
  CardId,
  CardTitle,
  CardSub,
  CardRight,
  ExpReturn,
  ExpReturnLabel,
  StatGrid,
  StatLabel,
  StatValueLarge,
  ProgressWrap,
  ProgressMeta,
  ProgressMetaLabel,
  ProgressMetaValue,
  CardActions,
  AllocateFullButton,
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
  FlexRow,
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
  MarketplaceOpportunity,
} from './useMarketplaceData';
import { getActiveEvents } from '../../api/riskLayers';
import { colors } from '../../xds/colors';
import {
  dealBadgeLabel,
  dealTone,
  formatDealReference,
  formatPct,
  formatShortCurrency,
  fundingStateLabel,
  riskPresentation,
  toCompactParts,
  trancheCaption,
  trancheTone,
} from './Marketplace.utils';

export type MarketplaceViewMode = 'aggregated' | 'individual' | 'table';

type Summary = {
  totalOpenCapacity: number;
  totalFunded: number;
  activeDeals: number;
};

const VIEW_MODE_OPTIONS = [
  { label: 'Aggregated', value: 'aggregated' },
  { label: 'Individual', value: 'individual' },
  { label: 'Table', value: 'table' },
];

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
          suffix="Deals"
          tone="danger"
          note={
            <StatNoteRow>
              <span className="material-symbols-outlined">emergency_home</span>
              Active Opportunities Pending Funding
            </StatNoteRow>
          }
        />
      </StatCardSurface>
    </StatsSection>
  );
}

// Page-level toggle between the geographic map and the marketplace deal section (filters + listing).
const MARKETPLACE_VIEW_OPTIONS = [
  { label: 'Map', value: 'map' },
  { label: 'Deals', value: 'deals' },
];

export type MarketplaceSectionView = 'map' | 'deals';

export function MarketplaceViewToggle({
  view,
  onChange,
}: {
  view: MarketplaceSectionView;
  onChange: (view: MarketplaceSectionView) => void;
}) {
  return (
    <SectionHead>
      <SectionTitle>{view === 'map' ? 'Deal Locations' : 'Deal Inventory'}</SectionTitle>
      <ViewModeControls>
        <SegmentedSwitch
          aria-label="Map or deals view"
          options={MARKETPLACE_VIEW_OPTIONS}
          value={view}
          onChange={(value: string) => onChange(value as MarketplaceSectionView)}
        />
      </ViewModeControls>
    </SectionHead>
  );
}

export function MarketplaceMapSection({
  dealsCount,
  totalOpenCapacity,
  mapPoints,
}: {
  dealsCount: number;
  totalOpenCapacity: number;
  mapPoints: Array<{ latitude: number; longitude: number; label?: string }>;
}) {
  return (
    <MapSectionWrap>
      <MapPanel
        title="Deal Locations"
        points={mapPoints}
        stats={[
          { label: 'Deals', value: String(dealsCount) },
          { label: 'Open Capacity', value: formatShortCurrency(totalOpenCapacity) },
        ]}
      />
    </MapSectionWrap>
  );
}

export function MarketplaceBodyLayout({
  filters,
  deals,
}: {
  filters: React.ReactNode;
  deals: React.ReactNode;
}) {
  return (
    <FlexRow>
      {filters}
      {deals}
    </FlexRow>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Page-local composite: a searchable, scrollable list of checkboxes with a
 * sticky select-all / clear footer. Built from xds Checkbox + Button primitives.
 */
function CheckboxFilterList({
  isLoading,
  error,
  hasMetadata,
  items,
  selectedKeys,
  selectedCount,
  onToggle,
  onSelectAll,
  onClear,
  loadingText,
  errorFallback,
  emptyMetadataText,
  emptyFilteredText,
}: {
  isLoading: boolean;
  error: string | null;
  hasMetadata: boolean;
  items: Array<{ key: string; label: string }>;
  selectedKeys: Set<string>;
  selectedCount: number;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  loadingText: string;
  errorFallback: string;
  emptyMetadataText: string;
  emptyFilteredText: string;
}) {
  const showFooter = !isLoading && !error && items.length > 0;

  return (
    <CheckboxFilterScroll>
      <CheckboxFilterItems>
        {isLoading ? (
          <CheckboxFilterMessage>{loadingText}</CheckboxFilterMessage>
        ) : error ? (
          <CheckboxFilterMessage>{error || errorFallback}</CheckboxFilterMessage>
        ) : !hasMetadata ? (
          <CheckboxFilterMessage>{emptyMetadataText}</CheckboxFilterMessage>
        ) : items.length === 0 ? (
          <CheckboxFilterMessage>{emptyFilteredText}</CheckboxFilterMessage>
        ) : (
          items.map((item) => (
            <Checkbox
              key={item.key}
              label={item.label}
              checked={selectedKeys.has(item.key)}
              onChange={() => onToggle(item.key)}
            />
          ))
        )}
      </CheckboxFilterItems>
      {showFooter ? (
        <CheckboxFilterFooter>
          <CheckboxFilterCount>{selectedCount} selected</CheckboxFilterCount>
          <CheckboxFilterActions>
            <Button variant="text" size="sm" onClick={onClear}>
              Clear
            </Button>
            <Button variant="text" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
          </CheckboxFilterActions>
        </CheckboxFilterFooter>
      ) : null}
    </CheckboxFilterScroll>
  );
}

export function MarketplaceFiltersSection({
  primaryTypes,
  isLoadingTaxonomy,
  taxonomyError,
}: {
  primaryTypes: LineOfBusinessPrimaryType[];
  isLoadingTaxonomy: boolean;
  taxonomyError: string | null;
}) {
  const [lineOfBusinessQuery, setLineOfBusinessQuery] = useState('');
  const [subTypeQuery, setSubTypeQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    lineOfBusiness: true,
    subTypes: true,
    duration: true,
    expectedYield: true,
  });
  const [selectedLineOfBusiness, setSelectedLineOfBusiness] = useState<Set<string>>(
    new Set()
  );
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(
    new Set()
  );

  const debouncedLineOfBusinessQuery = useDebouncedValue(lineOfBusinessQuery, 250);
  const debouncedSubTypeQuery = useDebouncedValue(subTypeQuery, 250);

  const normalizedLineOfBusinessQuery = debouncedLineOfBusinessQuery
    .trim()
    .toLowerCase();
  const normalizedSubTypeQuery = debouncedSubTypeQuery.trim().toLowerCase();

  useEffect(() => {
    const allPrimaryKeys = primaryTypes.map(
      (primaryType) => primaryType.code || primaryType.label
    );
    const allSubtypeKeys = primaryTypes.flatMap((primaryType) =>
      primaryType.subTypes.map((subType) => `${primaryType.code}:${subType.code}`)
    );

    setSelectedLineOfBusiness(new Set(allPrimaryKeys));
    setSelectedSubTypes(new Set(allSubtypeKeys));
  }, [primaryTypes]);

  const filteredPrimaryTypes = useMemo(() => {
    if (!normalizedLineOfBusinessQuery) {
      return primaryTypes;
    }

    return primaryTypes.filter((primaryType) =>
      primaryType.label.toLowerCase().includes(normalizedLineOfBusinessQuery)
    );
  }, [primaryTypes, normalizedLineOfBusinessQuery]);

  const allSubTypes = useMemo(
    () =>
      primaryTypes.flatMap((primaryType) =>
        primaryType.subTypes.map((subType) => ({
          key: `${primaryType.code}:${subType.code}`,
          label: `${primaryType.label} - ${subType.label}`,
        }))
      ),
    [primaryTypes]
  );

  const filteredSubTypes = useMemo(() => {
    if (!normalizedSubTypeQuery) {
      return allSubTypes;
    }

    return allSubTypes.filter((subType) =>
      subType.label.toLowerCase().includes(normalizedSubTypeQuery)
    );
  }, [allSubTypes, normalizedSubTypeQuery]);

  const lineOfBusinessItems = useMemo(
    () =>
      filteredPrimaryTypes.map((primaryType) => ({
        key: primaryType.code || primaryType.label,
        label: primaryType.label,
      })),
    [filteredPrimaryTypes]
  );

  const allPrimaryKeys = useMemo(
    () => lineOfBusinessItems.map((item) => item.key),
    [lineOfBusinessItems]
  );
  const allFilteredSubtypeKeys = useMemo(
    () => filteredSubTypes.map((subType) => subType.key),
    [filteredSubTypes]
  );

  const selectedLineOfBusinessCount = allPrimaryKeys.filter((key) =>
    selectedLineOfBusiness.has(key)
  ).length;
  const selectedSubTypeCount = allFilteredSubtypeKeys.filter((key) =>
    selectedSubTypes.has(key)
  ).length;

  const toggleLineOfBusinessSelection = (key: string) => {
    setSelectedLineOfBusiness((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSubTypeSelection = (key: string) => {
    setSelectedSubTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllLineOfBusiness = () => {
    setSelectedLineOfBusiness((prev) => {
      const next = new Set(prev);
      for (const key of allPrimaryKeys) {
        next.add(key);
      }
      return next;
    });
  };

  const clearLineOfBusiness = () => {
    setSelectedLineOfBusiness((prev) => {
      const next = new Set(prev);
      for (const key of allPrimaryKeys) {
        next.delete(key);
      }
      return next;
    });
  };

  const selectAllSubTypes = () => {
    setSelectedSubTypes((prev) => {
      const next = new Set(prev);
      for (const key of allFilteredSubtypeKeys) {
        next.add(key);
      }
      return next;
    });
  };

  const clearSubTypes = () => {
    setSelectedSubTypes((prev) => {
      const next = new Set(prev);
      for (const key of allFilteredSubtypeKeys) {
        next.delete(key);
      }
      return next;
    });
  };

  const toggleSection = (
    section: 'lineOfBusiness' | 'subTypes' | 'duration' | 'expectedYield'
  ) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <FiltersAside>
      <div>
        <FilterHeading>
          <span className="material-symbols-outlined">filter_list</span>
          Contract Properties
        </FilterHeading>
        <FilterStack>
          <CollapsibleSection
            title="Line of Business"
            collapsed={collapsedSections.lineOfBusiness}
            onToggle={() => toggleSection('lineOfBusiness')}
          >
            <FilterFieldStack>
              <Input
                placeholder="Search line of business..."
                value={lineOfBusinessQuery}
                onChange={(event) => setLineOfBusinessQuery(event.target.value)}
              />
              <CheckboxFilterList
                isLoading={isLoadingTaxonomy}
                error={taxonomyError}
                hasMetadata={primaryTypes.length > 0}
                items={lineOfBusinessItems}
                selectedKeys={selectedLineOfBusiness}
                selectedCount={selectedLineOfBusinessCount}
                onToggle={toggleLineOfBusinessSelection}
                onSelectAll={selectAllLineOfBusiness}
                onClear={clearLineOfBusiness}
                loadingText="Loading line of business values..."
                errorFallback="Unable to load line of business values."
                emptyMetadataText="No line of business metadata available."
                emptyFilteredText="No line of business matches your search."
              />
            </FilterFieldStack>
          </CollapsibleSection>

          <CollapsibleSection
            title="Sub Types"
            collapsed={collapsedSections.subTypes}
            onToggle={() => toggleSection('subTypes')}
          >
            <FilterFieldStack>
              <Input
                placeholder="Search sub types..."
                value={subTypeQuery}
                onChange={(event) => setSubTypeQuery(event.target.value)}
              />
              <CheckboxFilterList
                isLoading={isLoadingTaxonomy}
                error={taxonomyError}
                hasMetadata={allSubTypes.length > 0}
                items={filteredSubTypes}
                selectedKeys={selectedSubTypes}
                selectedCount={selectedSubTypeCount}
                onToggle={toggleSubTypeSelection}
                onSelectAll={selectAllSubTypes}
                onClear={clearSubTypes}
                loadingText="Loading subtype values..."
                errorFallback="Unable to load subtype values."
                emptyMetadataText="No subtype metadata available."
                emptyFilteredText="No subtype matches your search."
              />
            </FilterFieldStack>
          </CollapsibleSection>

          <CollapsibleSection
            title="Duration (Months)"
            collapsed={collapsedSections.duration}
            onToggle={() => toggleSection('duration')}
          >
            <Range />
            <RangeLabels>
              <span>3M</span>
              <span>12M</span>
              <span>24M</span>
              <span>36M</span>
            </RangeLabels>
          </CollapsibleSection>

          <CollapsibleSection
            title="Expected Yield (%)"
            collapsed={collapsedSections.expectedYield}
            onToggle={() => toggleSection('expectedYield')}
          >
            <FilterTwoColGrid>
              <Input placeholder="Min" />
              <Input placeholder="Max" />
            </FilterTwoColGrid>
          </CollapsibleSection>

          {taxonomyError ? (
            <SignalText>Unable to load taxonomy metadata.</SignalText>
          ) : null}
        </FilterStack>
      </div>
      <SignalCard>
        <SignalTitle>Live Market Signal</SignalTitle>
        <SignalText>
          High demand for Florida Cat 4-5 layers detected. Premiums increased by
          140bps in last 72h.
        </SignalText>
      </SignalCard>
    </FiltersAside>
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

function MarketplaceAggregatedDeals({ deals }: { deals: AggregatedDeal[] }) {
  return (
    <AggregatedCardsStack>
      {deals.map((deal) => {
        const tone = dealTone(deal.dealName, deal.tranches);

        return (
          <AggregatedDealCard key={deal.dealId}>
            <AggregatedAccentBar $tone={tone} />
            <AggregatedCardInner>
              <AggregatedDealHeader>
                <AggregatedDealMeta>
                  <AggregatedBadgeRow>
                    <Badge variant={toneToBadgeVariant(tone)}>
                      {dealBadgeLabel(deal.dealName)}
                    </Badge>
                    <AggregatedDealReference>
                      {formatDealReference(deal)}
                    </AggregatedDealReference>
                  </AggregatedBadgeRow>
                  <AggregatedDealTitle>{deal.dealName}</AggregatedDealTitle>
                  <AggregatedDealDescription>
                    {deal.dealStatus ? `${deal.dealStatus}. ` : ''}
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
                  <AggregatedTrancheHeaderCenter>Risk Score</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderCenter>Exp. Yield</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderCenter>Funded</AggregatedTrancheHeaderCenter>
                  <AggregatedTrancheHeaderRight>Action</AggregatedTrancheHeaderRight>
                </AggregatedTrancheHeader>

                {deal.tranches.map((tranche, index) => {
                  const risk = riskPresentation(tranche.riskLevel);
                  const toneForTranche = trancheTone(tranche.riskLevel);
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
                    <AggregatedTrancheRow key={tranche.id} $selected={index === 0}>
                      <AggregatedTrancheMain>
                        <AggregatedTrancheTitle>
                          {tranche.trancheName}
                        </AggregatedTrancheTitle>
                        <AggregatedTrancheCaption>
                          {trancheCaption(tranche.trancheName, index)}
                        </AggregatedTrancheCaption>
                      </AggregatedTrancheMain>

                      <AggregatedMetricCell>
                        <AggregatedMetricLabel>Risk Score</AggregatedMetricLabel>
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
                        <AggregatedAllocateButton $primary={index === 0}>
                          Allocate
                        </AggregatedAllocateButton>
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

function MarketplaceIndividualCards({
  opportunities,
}: {
  opportunities: MarketplaceOpportunity[];
}) {
  return (
    <CardsGrid>
      {opportunities.map((opportunity) => {
        const risk = riskPresentation(opportunity.riskLevel);
        const progress = Math.max(0, Math.min(100, opportunity.fundingProgressPct));

        return (
          <DealCardSurface key={opportunity.id}>
            {risk.highRisk ? <AccentBarTertiary /> : <AccentBarPrimary />}
            <CardBody>
              <CardTop>
                <div>
                  <CardBadgeRow>
                    <Badge variant={risk.highRisk ? 'tertiary' : 'secondary'}>
                      {risk.label}
                    </Badge>
                    <CardId>
                      #{opportunity.dealId}-{opportunity.trancheId}
                    </CardId>
                  </CardBadgeRow>
                  <CardTitle>{opportunity.dealName}</CardTitle>
                  <CardSub>
                    {opportunity.trancheName} -
                    {' '}
                    {fundingStateLabel(opportunity.fundingState)}
                  </CardSub>
                </div>
                <CardRight>
                  <ExpReturn $tone={risk.highRisk ? 'tertiary' : 'primary'}>
                    {formatPct(opportunity.expectedReturnPct)}
                  </ExpReturn>
                  <ExpReturnLabel>Exp. Return</ExpReturnLabel>
                </CardRight>
              </CardTop>
              <StatGrid>
                <div>
                  <StatLabel>Risk Score</StatLabel>
                  <StatValueLarge $tone={risk.highRisk ? 'error' : 'secondary'}>
                    {risk.score}
                  </StatValueLarge>
                </div>
                <div>
                  <StatLabel>Committed Capital</StatLabel>
                  <StatValueLarge $tone="mono">
                    {formatShortCurrency(opportunity.committedCapital)}
                  </StatValueLarge>
                </div>
                <div>
                  <StatLabel>Duration</StatLabel>
                  <StatValueLarge>{opportunity.durationMonths} Mo</StatValueLarge>
                </div>
              </StatGrid>
              <ProgressWrap>
                <ProgressMeta>
                  <ProgressMetaLabel>Funding Progress</ProgressMetaLabel>
                  <ProgressMetaValue $tone={risk.highRisk ? 'tertiary' : 'primary'}>
                    {formatPct(progress)}
                  </ProgressMetaValue>
                </ProgressMeta>
                <ProgressBar
                  value={progress}
                  tone={risk.highRisk ? 'tertiary' : 'primary'}
                  size="sm"
                />
              </ProgressWrap>
              <CardActions>
                <AllocateFullButton>
                  <Button variant="primary">ALLOCATE CAPITAL</Button>
                </AllocateFullButton>
                <Button variant="outline" aria-label="View opportunity">
                  <span className="material-symbols-outlined">
                    visibility
                  </span>
                </Button>
              </CardActions>
            </CardBody>
          </DealCardSurface>
        );
      })}
    </CardsGrid>
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
  setViewMode,
  isLoading,
  error,
  opportunities,
  deals,
  tableRows,
}: {
  viewMode: MarketplaceViewMode;
  setViewMode: (mode: MarketplaceViewMode) => void;
  isLoading: boolean;
  error: string | null;
  opportunities: MarketplaceOpportunity[];
  deals: AggregatedDeal[];
  tableRows: DataTableRow[];
}) {
  const hasNoData = opportunities.length === 0;

  return (
    <DealGrid>
      <SectionHead>
        <SectionTitle>
          {viewMode === 'aggregated'
            ? 'Master Deal Inventory'
            : 'Active Opportunities'}
        </SectionTitle>
        <SortControls>
          <Button variant="ghost" size="sm">
            Recent
          </Button>
          <Button variant="ghost" size="sm">
            Yield High-Low
          </Button>
        </SortControls>
        <ViewModeControls>
          <SegmentedSwitch
            aria-label="View mode"
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={(value: string) => setViewMode(value as MarketplaceViewMode)}
          />
        </ViewModeControls>
      </SectionHead>

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
      ) : hasNoData ? (
        <MarketplaceStateCard
          title="No pending opportunities"
          subtitle="All active opportunities are currently fully funded."
        />
      ) : viewMode === 'aggregated' ? (
        <MarketplaceAggregatedDeals deals={deals} />
      ) : viewMode === 'table' ? (
        <MarketplaceTableSection rows={tableRows} />
      ) : (
        <MarketplaceIndividualCards opportunities={opportunities} />
      )}
    </DealGrid>
  );
}

// Live catastrophe events for the footer ticker. Properties mirror the active-events map layer.
type TickerEvent = {
  title?: string;
  place?: string;
  peril?: string;
  severityLevel?: 'low' | 'moderate' | 'high' | 'severe' | string;
};

// Severity ramp shared with the map's active-events layer.
const TICKER_SEVERITY_COLOR: Record<string, string> = {
  severe: colors.dataViz.red,
  high: colors.dataViz.orange,
  moderate: colors.dataViz.amber,
  low: colors.dataViz.green,
};

function formatTickerEvent(e: TickerEvent): string {
  const peril = e.peril ? `${e.peril.toUpperCase()}: ` : '';
  const place = e.place ? ` — ${e.place}` : '';
  return `${peril}${e.title ?? 'Event'}${place}`;
}

// Streams the live active-events feed into the footer ticker, refreshing every 5 minutes to match
// the map layer's cadence. Falls back to a static line while loading or if the feed is unavailable.
function useLiveRiskEvents(): TickerEvent[] {
  const [events, setEvents] = useState<TickerEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getActiveEvents<{ features?: Array<{ properties?: TickerEvent }> }>()
        .then((data) => {
          if (cancelled) return;
          const items = (data?.features ?? [])
            .map((f) => f.properties)
            .filter((p): p is TickerEvent => Boolean(p && p.title));
          setEvents(items);
        })
        .catch(() => {
          /* keep the static fallback on error */
        });
    };

    load();
    const handle = window.setInterval(load, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  return events;
}

export function MarketplaceFooterSection() {
  const events = useLiveRiskEvents();

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
          Global TVL: <FooterStrong>$4.2B</FooterStrong>
        </FooterStat>
        <FooterStat>
          Active Tranches: <FooterStrong>142</FooterStrong>
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
