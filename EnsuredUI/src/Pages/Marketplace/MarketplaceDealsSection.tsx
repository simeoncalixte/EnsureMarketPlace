import React, { useEffect, useRef } from 'react';
import DataTable, { type Row as DataTableRow } from '../../xds/components/DataTable';
import Badge from '../../xds/components/Badge';
import ProgressBar from '../../xds/components/ProgressBar';
import SegmentedSwitch from '../../xds/components/SegmentedSwitch';
import type { AggregatedDeal, MarketplaceOpportunity } from './marketplaceTypes';
import type { MarketplaceViewMode } from './useMarketplaceFilters';
import {
  cleanDealName,
  dealBadgeLabel,
  dealTone,
  formatDealReference,
  formatPct,
  formatShortCurrency,
  riskPresentation,
  trancheCaption,
  trancheTone,
} from './Marketplace.utils';
import {
  DealGrid,
  DealsPaneHead,
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
  CardsGrid,
  TableScroll,
  DealCardSurface,
  AccentBarPrimary,
  AccentBarTertiary,
  CardBody,
  CardTitle,
  CardSub,
} from './Marketplace.styles';

const toneToBadgeVariant = (
  tone: 'primary' | 'secondary' | 'tertiary'
): 'primary' | 'secondary' | 'tertiary' => tone;

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
                  <span className="material-symbols-outlined">description</span>
                  View Prospectus
                </AggregatedFooterAction>
                <AggregatedFooterAction>
                  <span className="material-symbols-outlined">visibility</span>
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

const DENSITY_OPTIONS = [
  { label: 'Cards', value: 'aggregated' },
  { label: 'Table', value: 'table' },
];

export function MarketplaceDealsSection({
  viewMode,
  onViewModeChange,
  isLoading,
  error,
  opportunities,
  totalOpportunityCount,
  deals,
  tableRows,
  highlightedDealId,
}: {
  viewMode: MarketplaceViewMode;
  onViewModeChange: (mode: MarketplaceViewMode) => void;
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
  const hasData = !isLoading && !error && !hasNoData;

  return (
    <DealGrid>
      {hasData ? (
        <DealsPaneHead>
          <SegmentedSwitch
            aria-label="Deal list density"
            options={DENSITY_OPTIONS}
            value={viewMode}
            onChange={(value: string) =>
              onViewModeChange(value as MarketplaceViewMode)
            }
          />
        </DealsPaneHead>
      ) : null}
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
