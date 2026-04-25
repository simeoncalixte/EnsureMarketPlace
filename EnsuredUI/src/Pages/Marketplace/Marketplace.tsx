import React, { useEffect, useMemo, useState } from "react";
import {
  Page,
  Header,
  Sidebar,
  Main,
  Footer,
  StatCard,
  HeaderLink,
  HeaderSubLink,
  SidebarLink,
  ActiveSidebarLink,
  PrimaryButton,
  IconButton,
  DealCard,
  FooterLink,
  DealGrid,
  HeaderInner,
  BrandTitle,
  HeaderNav,
  HeaderActions,
  IconCircleBtn,
  AvatarWrap,
  SidebarHeader,
  SidebarH2,
  SidebarP,
  SidebarNav,
  SidebarFooterWrap,
  StatsSection,
  StatTitle,
  StatValue,
  StatCurrencyPrimary,
  StatCurrencySecondary,
  StatSuffixDim,
  StatNotePrimary,
  StatNoteVariant,
  StatNoteTertiary,
  FlexRow,
  FiltersAside,
  FilterHeading,
  SpaceY,
  LabelSmall,
  CheckboxRow,
  CheckboxLabel,
  StyledCheckbox,
  CheckboxText,
  RangeInput,
  RangeLabels,
  TextInput,
  SignalCard,
  SignalTitle,
  SignalText,
  SectionHead,
  SectionTitle,
  SortControls,
  SortButton,
  CardsGrid,
  AggregatedCardsStack,
  AggregatedDealCard,
  AggregatedAccentBar,
  AggregatedCardInner,
  AggregatedDealHeader,
  AggregatedDealMeta,
  AggregatedBadgeRow,
  AggregatedDealBadge,
  AggregatedDealReference,
  AggregatedDealTitle,
  AggregatedDealDescription,
  AggregatedSummary,
  AggregatedSummaryMetric,
  AggregatedSummaryLabel,
  AggregatedSummaryValue,
  AggregatedTrancheTable,
  AggregatedTrancheHeader,
  AggregatedTrancheRow,
  AggregatedTrancheMain,
  AggregatedTrancheTitle,
  AggregatedTrancheCaption,
  AggregatedMetricCell,
  AggregatedMetricLabel,
  AggregatedRiskScore,
  AggregatedYieldValue,
  AggregatedFundedCell,
  AggregatedFundedBar,
  AggregatedFundedFill,
  AggregatedFundedValue,
  AggregatedActionCell,
  AggregatedAllocateButton,
  AggregatedFooter,
  AggregatedFooterAction,
  AccentBarPrimary,
  AccentBarTertiary,
  CardBody,
  CardTop,
  BadgeSpan,
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
  ProgressTrack,
  ProgressFillPrimary,
  ProgressFillTertiary,
  CardActions,
  FooterStatus,
  PulseRow,
  PulseDot,
  FooterStat,
} from './Marketplace.styles';
import MapPanel from '../../xds/components/MapPanel';

type MarketplaceOpportunity = {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
  latitude?: number;
  longitude?: number;
};

type AggregatedDeal = {
  dealId: number;
  dealName: string;
  dealStatus: string;
  startDate: string;
  endDate: string;
  tranches: MarketplaceOpportunity[];
  totalDealSize: number;
  durationMonths: number;
};

function resolveApiBase(): string {
  const raw =
    (typeof window !== 'undefined' && (((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE) as string | undefined))
    || (import.meta as any).env?.VITE_API_BASE
    || '';

  if (!raw) return '';

  // Handle accidental duplication like "http://hosthttp://host" by taking the last occurrence
  const firstHttp = raw.indexOf('http');
  const lastHttp = raw.lastIndexOf('http');
  let base = raw;
  if (lastHttp > firstHttp) {
    base = raw.slice(lastHttp);
  }

  // strip trailing slashes
  base = base.replace(/\/+$/g, '');

  return base;
}

function toCompactParts(value?: number): { value: string; suffix: string } {
  // Defensive: treat non-finite or missing values as zero to avoid calling
  // methods like `toFixed` on undefined.
  if (!Number.isFinite(value as number)) {
    return { value: '0', suffix: '' };
  }

  const v = value as number;
  const absValue = Math.abs(v);
  if (absValue >= 1_000_000_000) {
    return { value: (v / 1_000_000_000).toFixed(2), suffix: 'B' };
  }
  if (absValue >= 1_000_000) {
    return { value: (v / 1_000_000).toFixed(1), suffix: 'M' };
  }
  if (absValue >= 1_000) {
    return { value: (v / 1_000).toFixed(1), suffix: 'K' };
  }

  return { value: v.toFixed(0), suffix: '' };
}

function formatShortCurrency(value: number): string {
  const compact = toCompactParts(value);
  return `$${compact.value}${compact.suffix}`;
}

function formatPct(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

function riskPresentation(riskLevel: string): { label: string; score: string; highRisk: boolean } {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized === 'high') {
    return { label: 'High Risk', score: 'D+', highRisk: true };
  }
  if (normalized === 'medium') {
    return { label: 'Balanced', score: 'B', highRisk: false };
  }
  return { label: 'Cat Layer', score: 'A-', highRisk: false };
}

function fundingStateLabel(state: MarketplaceOpportunity['fundingState']): string {
  if (state === 'new') {
    return 'New Opportunity - 0% Funded';
  }
  return 'Partially Funded';
}

function dealTone(dealName: string, tranches: MarketplaceOpportunity[]): 'primary' | 'secondary' | 'tertiary' {
  const normalized = dealName.toLowerCase();
  if (normalized.includes('earthquake') || normalized.includes('seismic')) {
    return 'secondary';
  }

  const hasHighRisk = tranches.some((tranche) => riskPresentation(tranche.riskLevel).highRisk);
  if (hasHighRisk) {
    return 'tertiary';
  }

  return 'primary';
}

function dealBadgeLabel(dealName: string): string {
  const normalized = dealName.toLowerCase();
  if (normalized.includes('hurricane') || normalized.includes('cat')) {
    return 'Hurricane Cat';
  }
  if (normalized.includes('earthquake') || normalized.includes('seismic')) {
    return 'Seismic Event';
  }
  if (normalized.includes('wildfire')) {
    return 'Wildfire Layer';
  }
  if (normalized.includes('flood')) {
    return 'Flood Risk';
  }
  return 'Structured Risk';
}

function formatDealReference(deal: AggregatedDeal): string {
  const year = (deal.startDate || deal.endDate || '').slice(0, 4) || '2026';
  const initials = deal.dealName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DL';

  return `#${initials}-${year}-${String(deal.dealId).padStart(2, '0')}`;
}

function trancheCaption(trancheName: string, index: number): string {
  const normalized = trancheName.toLowerCase();
  if (normalized.includes('senior')) {
    return '1st Loss Protection Layer';
  }
  if (normalized.includes('mezz')) {
    return 'Excess of Loss Layer';
  }
  if (normalized.includes('equity') || normalized.includes('residual')) {
    return 'High Yield Junior Layer';
  }
  if (normalized.includes('parametric')) {
    return 'Immediate Liquidity Trigger';
  }
  return `Structured Tranche ${index + 1}`;
}

function trancheTone(riskLevel: string): 'primary' | 'secondary' | 'tertiary' {
  const risk = riskPresentation(riskLevel);
  if (risk.highRisk) {
    return 'tertiary';
  }
  if (risk.score.startsWith('A')) {
    return 'secondary';
  }
  return 'primary';
}

export default function MarketplacePage() {
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>([]);
  const [viewMode, setViewMode] = useState<'aggregated' | 'individual' | 'table'>('aggregated');
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoadingOpportunities(true);
    setOpportunitiesError(null);

    const API_BASE = resolveApiBase();
    const path = '/api/marketplace/opportunities/active-pending-funding';
    const endpoint = API_BASE ? `${API_BASE}${path}` : path;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) {
          return;
        }

        // API returns an array of deals, each with a `tranches` array.
        // The UI expects a flat list of tranche-level opportunities, so
        // detect and flatten here for backward compatibility.
        let items: any[] = Array.isArray(data) ? data : [];
        if (items.length > 0 && Array.isArray(items[0].tranches)) {
          const flat: any[] = [];
          for (const deal of items) {
            const dealId = deal.dealId ?? deal.id ?? null;
            const dealName = deal.dealName ?? deal.name ?? '';
            const dealStatus = deal.dealStatus ?? deal.status ?? '';
            const startDate = deal.startDate ?? deal.start_date ?? '';
            const endDate = deal.endDate ?? deal.end_date ?? '';

            for (const t of (deal.tranches ?? [])) {
              // Extract latitude/longitude if provided on the tranche or the deal
              const latitude = t.latitude ?? deal.latitude ?? t.lat ?? deal.lat ?? undefined;
              const longitude = t.longitude ?? deal.longitude ?? t.lng ?? deal.lng ?? undefined;

              flat.push({
                id: t.id ?? `${dealId}-${t.trancheId ?? t.trancheId}`,
                dealId,
                dealName,
                dealStatus,
                trancheId: t.trancheId ?? t.trancheId ?? t.id,
                fundingState: t.fundingState,
                trancheName: t.trancheName ?? t.trancheName ?? t.name,
                riskLevel: t.riskLevel,
                expectedReturnPct: t.expectedReturnPct,
                maxLoss: t.maxLoss,
                durationMonths: t.durationMonths,
                capitalRequired: t.capitalRequired,
                committedCapital: t.committedCapital ?? t.fundedAmount,
                fundedAmount: t.fundedAmount,
                pendingAmount: t.pendingAmount,
                fundingProgressPct: t.fundingProgressPct,
                startDate: t.startDate ?? startDate,
                endDate: t.endDate ?? endDate,
                latitude,
                longitude,
              });
            }
          }

          items = flat;
        }

        setOpportunities(items);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setOpportunities([]);
        setOpportunitiesError(`${String(error.message || error)} (endpoint: ${endpoint})`);
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingOpportunities(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const totalOpenCapacity = opportunities.reduce((sum, item) => sum + item.pendingAmount, 0);
    const totalFunded = opportunities.reduce((sum, item) => sum + item.fundedAmount, 0);
    const activeDeals = new Set(opportunities.map((item) => item.dealId)).size;

    return {
      totalOpenCapacity,
      totalFunded,
      activeDeals,
    };
  }, [opportunities]);

  const openCapacity = toCompactParts(summary.totalOpenCapacity);
  const totalFunded = toCompactParts(summary.totalFunded);

  const deals = useMemo<AggregatedDeal[]>(() => {
    const map = new Map<number, Omit<AggregatedDeal, 'totalDealSize' | 'durationMonths'>>();
    for (const t of opportunities) {
      const dealId = t.dealId ?? 0;
      if (!map.has(dealId)) {
        map.set(dealId, {
          dealId,
          dealName: t.dealName ?? '',
          dealStatus: t.dealStatus ?? '',
          startDate: t.startDate ?? '',
          endDate: t.endDate ?? '',
          tranches: [],
        });
      }
      const groupedDeal = map.get(dealId);
      if (groupedDeal) {
        groupedDeal.tranches.push(t);
      }
    }

    return Array.from(map.values()).map((d) => {
      const totalDealSize = d.tranches.reduce((s, tr) => s + (tr.capitalRequired ?? 0), 0);
      const durationMonths = d.tranches.reduce((m, tr) => Math.max(m, tr.durationMonths ?? 0), 0);
      return { ...d, totalDealSize, durationMonths };
    });
  }, [opportunities]);

  const mapPoints = useMemo(() => {
    const duplicateCounts = new Map<string, number>();
    const pts: Array<{ latitude: number; longitude: number; label?: string }> = [];

    for (const opportunity of opportunities) {
      const lat = Number(opportunity.latitude);
      const lng = Number(opportunity.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      // Keep one marker per opportunity; offset duplicates slightly so stacked
      // opportunities at identical coordinates remain visible.
      const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      const duplicateIndex = duplicateCounts.get(key) ?? 0;
      duplicateCounts.set(key, duplicateIndex + 1);

      let adjustedLat = lat;
      let adjustedLng = lng;
      if (duplicateIndex > 0) {
        const angle = duplicateIndex * 2.399963229728653;
        const radius = 0.0015 * Math.sqrt(duplicateIndex);
        adjustedLat = lat + Math.sin(angle) * radius;
        adjustedLng = lng + Math.cos(angle) * radius;
      }

      pts.push({
        latitude: adjustedLat,
        longitude: adjustedLng,
        label: `${opportunity.dealName} • ${opportunity.trancheName}`,
      });
    }

    return pts;
  }, [opportunities]);

  return (
    <Page>
      <Main>
        <StatsSection>
          <StatCard className="border-primary">
            <StatTitle>Total Open Capacity</StatTitle>
            <StatValue>
              <StatCurrencyPrimary>$</StatCurrencyPrimary>{openCapacity.value}<StatSuffixDim>{openCapacity.suffix}</StatSuffixDim>
            </StatValue>
            <StatNotePrimary>
              <span className="material-symbols-outlined text-sm">trending_up</span>
              Live Pending Funding Capacity
            </StatNotePrimary>
          </StatCard>
          <StatCard className="border-secondary">
            <StatTitle>Total Funded</StatTitle>
            <StatValue>
              <StatCurrencySecondary>$</StatCurrencySecondary>{totalFunded.value}<span className="text-xl text-secondary-fixed-dim">{totalFunded.suffix}</span>
            </StatValue>
            <StatNoteVariant>
              <span className="material-symbols-outlined text-sm">history</span>
              Funding Already Committed
            </StatNoteVariant>
          </StatCard>
          <StatCard className="border-tertiary">
            <StatTitle>Active Deals</StatTitle>
            <StatValue>
              {summary.activeDeals}<span className="text-xl text-tertiary-fixed-dim">Deals</span>
            </StatValue>
            <StatNoteTertiary>
              <span className="material-symbols-outlined text-sm">emergency_home</span>
              Active Opportunities Pending Funding
            </StatNoteTertiary>
          </StatCard>
        </StatsSection>

        <div style={{ margin: '20px 0' }}>
          <MapPanel
            title="Deal Locations"
            points={mapPoints}
            stats={[
              { label: 'Deals', value: String(deals.length) },
              { label: 'Open Capacity', value: formatShortCurrency(summary.totalOpenCapacity) },
            ]}
          />
        </div>

        <FlexRow>
          <FiltersAside>
            <div>
              <FilterHeading>
                <span className="material-symbols-outlined text-primary">filter_list</span>
                Risk Filters
              </FilterHeading>
              <SpaceY>
                <div>
                  <LabelSmall>Risk Type</LabelSmall>
                  <CheckboxRow>
                    <CheckboxLabel>
                      <StyledCheckbox defaultChecked />
                      <CheckboxText>Hurricane (CAT)</CheckboxText>
                    </CheckboxLabel>
                    <CheckboxLabel>
                      <StyledCheckbox defaultChecked />
                      <CheckboxText>Tornado / Wind</CheckboxText>
                    </CheckboxLabel>
                    <CheckboxLabel>
                      <StyledCheckbox />
                      <CheckboxText>Wildfire</CheckboxText>
                    </CheckboxLabel>
                    <CheckboxLabel>
                      <StyledCheckbox />
                      <CheckboxText>Flood / Inundation</CheckboxText>
                    </CheckboxLabel>
                  </CheckboxRow>
                </div>
                <div>
                  <LabelSmall>Duration (Months)</LabelSmall>
                  <RangeInput />
                  <RangeLabels>
                    <span>3M</span>
                    <span>12M</span>
                    <span>24M</span>
                    <span>36M</span>
                  </RangeLabels>
                </div>
                <div>
                  <LabelSmall>Expected Yield (%)</LabelSmall>
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput placeholder="Min" />
                    <TextInput placeholder="Max" />
                  </div>
                </div>
              </SpaceY>
            </div>
            <SignalCard>
              <SignalTitle>Live Market Signal</SignalTitle>
              <SignalText>High demand for Florida Cat 4-5 layers detected. Premiums increased by 140bps in last 72h.</SignalText>
            </SignalCard>
          </FiltersAside>

          <DealGrid>
            <SectionHead>
              <SectionTitle>{viewMode === 'aggregated' ? 'Master Deal Inventory' : 'Active Opportunities'}</SectionTitle>
              <SortControls>
                <SortButton>Recent</SortButton>
                <SortButton>Yield High-Low</SortButton>
              </SortControls>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                <SortButton onClick={() => setViewMode('aggregated')} className={viewMode === 'aggregated' ? 'active' : ''}>Aggregated</SortButton>
                <SortButton onClick={() => setViewMode('individual')} className={viewMode === 'individual' ? 'active' : ''}>Individual</SortButton>
                <SortButton onClick={() => setViewMode('table')} className={viewMode === 'table' ? 'active' : ''}>Table</SortButton>
              </div>
            </SectionHead>
            {viewMode === 'aggregated' ? (
              <AggregatedCardsStack>
                {isLoadingOpportunities ? (
                  <DealCard>
                    <AccentBarPrimary />
                    <CardBody>
                      <CardTitle>Loading opportunities...</CardTitle>
                      <CardSub>Pulling live active opportunities pending funding from the API.</CardSub>
                    </CardBody>
                  </DealCard>
                ) : opportunitiesError ? (
                  <DealCard>
                    <AccentBarTertiary />
                    <CardBody>
                      <CardTitle>Unable to load opportunities</CardTitle>
                      <CardSub>{opportunitiesError}</CardSub>
                    </CardBody>
                  </DealCard>
                ) : opportunities.length === 0 ? (
                  <DealCard>
                    <AccentBarPrimary />
                    <CardBody>
                      <CardTitle>No pending opportunities</CardTitle>
                      <CardSub>All active opportunities are currently fully funded.</CardSub>
                    </CardBody>
                  </DealCard>
                ) : (
                  deals.map((deal) => {
                    const tone = dealTone(deal.dealName, deal.tranches);

                    return (
                      <AggregatedDealCard key={deal.dealId}>
                        <AggregatedAccentBar $tone={tone} />
                        <AggregatedCardInner>
                          <AggregatedDealHeader>
                            <AggregatedDealMeta>
                              <AggregatedBadgeRow>
                                <AggregatedDealBadge $tone={tone}>{dealBadgeLabel(deal.dealName)}</AggregatedDealBadge>
                                <AggregatedDealReference>{formatDealReference(deal)}</AggregatedDealReference>
                              </AggregatedBadgeRow>
                              <AggregatedDealTitle>{deal.dealName}</AggregatedDealTitle>
                              <AggregatedDealDescription>
                                {deal.dealStatus ? `${deal.dealStatus}. ` : ''}
                                {deal.tranches.length} tranche{deal.tranches.length === 1 ? '' : 's'} currently open for allocation.
                              </AggregatedDealDescription>
                            </AggregatedDealMeta>

                            <AggregatedSummary>
                              <AggregatedSummaryMetric>
                                <AggregatedSummaryLabel>Total Deal Size</AggregatedSummaryLabel>
                                <AggregatedSummaryValue>{formatShortCurrency(deal.totalDealSize)}</AggregatedSummaryValue>
                              </AggregatedSummaryMetric>
                              <AggregatedSummaryMetric>
                                <AggregatedSummaryLabel>Duration</AggregatedSummaryLabel>
                                <AggregatedSummaryValue>{deal.durationMonths || 0} Mo</AggregatedSummaryValue>
                              </AggregatedSummaryMetric>
                            </AggregatedSummary>
                          </AggregatedDealHeader>

                          <AggregatedTrancheTable>
                            <AggregatedTrancheHeader>
                              <div>Tranche Class</div>
                              <div style={{ textAlign: 'center' }}>Risk Score</div>
                              <div style={{ textAlign: 'center' }}>Exp. Yield</div>
                              <div style={{ textAlign: 'center' }}>Funded</div>
                              <div style={{ textAlign: 'right' }}>Action</div>
                            </AggregatedTrancheHeader>

                            {deal.tranches.map((tranche, index) => {
                              const risk = riskPresentation(tranche.riskLevel);
                              const toneForTranche = trancheTone(tranche.riskLevel);
                              const progress = Math.max(0, Math.min(100, tranche.fundingProgressPct));

                              return (
                                <AggregatedTrancheRow key={tranche.id} $selected={index === 0}>
                                  <AggregatedTrancheMain>
                                    <AggregatedTrancheTitle>{tranche.trancheName}</AggregatedTrancheTitle>
                                    <AggregatedTrancheCaption>{trancheCaption(tranche.trancheName, index)}</AggregatedTrancheCaption>
                                  </AggregatedTrancheMain>

                                  <AggregatedMetricCell>
                                    <AggregatedMetricLabel>Risk Score</AggregatedMetricLabel>
                                    <AggregatedRiskScore $tone={toneForTranche}>{risk.score}</AggregatedRiskScore>
                                  </AggregatedMetricCell>

                                  <AggregatedMetricCell>
                                    <AggregatedMetricLabel>Exp. Yield</AggregatedMetricLabel>
                                    <AggregatedYieldValue $tone={toneForTranche}>{formatPct(tranche.expectedReturnPct)}</AggregatedYieldValue>
                                  </AggregatedMetricCell>

                                  <AggregatedFundedCell>
                                    <AggregatedMetricLabel>Funded</AggregatedMetricLabel>
                                    <AggregatedFundedBar>
                                      <AggregatedFundedFill $tone={toneForTranche} $width={progress} />
                                    </AggregatedFundedBar>
                                    <AggregatedFundedValue>{Math.round(progress)}%</AggregatedFundedValue>
                                  </AggregatedFundedCell>

                                  <AggregatedActionCell>
                                    <AggregatedAllocateButton $primary={index === 0}>Allocate</AggregatedAllocateButton>
                                  </AggregatedActionCell>
                                </AggregatedTrancheRow>
                              );
                            })}
                          </AggregatedTrancheTable>

                          <AggregatedFooter>
                            <AggregatedFooterAction>
                              <span className="material-symbols-outlined text-sm">description</span>
                              View Prospectus
                            </AggregatedFooterAction>
                            <AggregatedFooterAction>
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              Risk Model
                            </AggregatedFooterAction>
                          </AggregatedFooter>
                        </AggregatedCardInner>
                      </AggregatedDealCard>
                    );
                  })
                )}
              </AggregatedCardsStack>
            ) : (
              <CardsGrid>
                {isLoadingOpportunities ? (
                  <DealCard>
                    <AccentBarPrimary />
                    <CardBody>
                      <CardTitle>Loading opportunities...</CardTitle>
                      <CardSub>Pulling live active opportunities pending funding from the API.</CardSub>
                    </CardBody>
                  </DealCard>
                ) : opportunitiesError ? (
                  <DealCard>
                    <AccentBarTertiary />
                    <CardBody>
                      <CardTitle>Unable to load opportunities</CardTitle>
                      <CardSub>{opportunitiesError}</CardSub>
                    </CardBody>
                  </DealCard>
                ) : opportunities.length === 0 ? (
                  <DealCard>
                    <AccentBarPrimary />
                    <CardBody>
                      <CardTitle>No pending opportunities</CardTitle>
                      <CardSub>All active opportunities are currently fully funded.</CardSub>
                    </CardBody>
                  </DealCard>
                ) : viewMode !== 'table' ? (
                  opportunities.map((opportunity) => {
                    const risk = riskPresentation(opportunity.riskLevel);
                    const progress = Math.max(0, Math.min(100, opportunity.fundingProgressPct));

                    return (
                      <DealCard key={opportunity.id}>
                        {risk.highRisk ? <AccentBarTertiary /> : <AccentBarPrimary />}
                        <CardBody>
                          <CardTop>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <BadgeSpan>{risk.label}</BadgeSpan>
                                <CardId>#{opportunity.dealId}-{opportunity.trancheId}</CardId>
                              </div>
                              <CardTitle>{opportunity.dealName}</CardTitle>
                              <CardSub>{opportunity.trancheName} - {fundingStateLabel(opportunity.fundingState)}</CardSub>
                            </div>
                            <CardRight>
                              <ExpReturn className={risk.highRisk ? 'text-tertiary' : 'text-primary'}>{formatPct(opportunity.expectedReturnPct)}</ExpReturn>
                              <ExpReturnLabel>Exp. Return</ExpReturnLabel>
                            </CardRight>
                          </CardTop>
                          <StatGrid>
                            <div>
                              <StatLabel>Risk Score</StatLabel>
                              <StatValueLarge className={risk.highRisk ? 'text-error' : 'text-secondary'}>{risk.score}</StatValueLarge>
                            </div>
                            <div>
                              <StatLabel>Committed Capital</StatLabel>
                              <StatValueLarge className="font-mono">{formatShortCurrency(opportunity.committedCapital)}</StatValueLarge>
                            </div>
                            <div>
                              <StatLabel>Duration</StatLabel>
                              <StatValueLarge>{opportunity.durationMonths} Mo</StatValueLarge>
                            </div>
                          </StatGrid>
                          <ProgressWrap>
                            <ProgressMeta>
                              <span className="text-on-surface-variant">Funding Progress</span>
                              <span className={risk.highRisk ? 'text-tertiary' : 'text-primary'}>{formatPct(progress)}</span>
                            </ProgressMeta>
                            <ProgressTrack>
                              {risk.highRisk ? (
                                <ProgressFillTertiary style={{ width: `${progress}%` }} />
                              ) : (
                                <ProgressFillPrimary style={{ width: `${progress}%` }} />
                              )}
                            </ProgressTrack>
                          </ProgressWrap>
                          <CardActions>
                            <PrimaryButton>ALLOCATE CAPITAL</PrimaryButton>
                            <IconButton>
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </IconButton>
                          </CardActions>
                        </CardBody>
                      </DealCard>
                    );
                  })
                ) : (
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text, #e6eef8)' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <th style={{ padding: '12px 8px' }}>Deal</th>
                          <th style={{ padding: '12px 8px' }}>Tranche</th>
                          <th style={{ padding: '12px 8px' }}>Risk</th>
                          <th style={{ padding: '12px 8px' }}>Yield</th>
                          <th style={{ padding: '12px 8px' }}>Funded</th>
                          <th style={{ padding: '12px 8px' }}>Pending</th>
                          <th style={{ padding: '12px 8px' }}>Duration</th>
                          <th style={{ padding: '12px 8px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((t) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '12px 8px' }}>{t.dealName}</td>
                            <td style={{ padding: '12px 8px' }}>{t.trancheName}</td>
                            <td style={{ padding: '12px 8px' }}>{riskPresentation(t.riskLevel).score}</td>
                            <td style={{ padding: '12px 8px' }}>{formatPct(t.expectedReturnPct)}</td>
                            <td style={{ padding: '12px 8px' }}>{formatShortCurrency(t.fundedAmount)}</td>
                            <td style={{ padding: '12px 8px' }}>{formatShortCurrency(t.pendingAmount)}</td>
                            <td style={{ padding: '12px 8px' }}>{t.durationMonths} Mo</td>
                            <td style={{ padding: '12px 8px' }}><PrimaryButton>Allocate</PrimaryButton></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardsGrid>
            )}
            </DealGrid>
          </FlexRow>
      </Main>

      <Footer>
        <FooterStatus>
          <PulseRow>
            <PulseDot />
            Hurricane Milton: Cat 4 approaching Florida...
          </PulseRow>
          <FooterStat>Global TVL: <span className="text-slate-300 font-bold">$4.2B</span></FooterStat>
          <FooterStat>Active Tranches: <span className="text-slate-300 font-bold">142</span></FooterStat>
        </FooterStatus>
        <div className="flex items-center gap-4">
          <FooterLink href="#">Network Status</FooterLink>
          <FooterLink href="#">Risk Feed</FooterLink>
          <FooterLink href="#">Documentation</FooterLink>
        </div>
      </Footer>
    </Page>
  );
}
