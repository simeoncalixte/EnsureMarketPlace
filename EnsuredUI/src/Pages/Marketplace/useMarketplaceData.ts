import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getActivePendingFunding,
  getLineOfBusinessTaxonomyResponse,
  OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH,
  TAXONOMY_PATH,
} from '../../api/marketplace';
import { getActiveEvents } from '../../api/riskLayers';
import { cleanDealName } from './Marketplace.utils';
import { useActivePendingFundingLoader } from '../../hooks/useMarketplaceLoaders';
import { asNumber, asString, asOptionalString } from '../../utils/helpers';
import type {
  MarketplaceOpportunity,
  AggregatedDeal,
  LineOfBusinessSubType,
  LineOfBusinessPrimaryType,
  MarketplaceSummary,
  LiveRiskEvent,
} from './marketplaceTypes';

// Marketplace data refresh cadence — matches the map's active-events layer.
const REFRESH_INTERVAL_MS = 5 * 60_000;




function normalizeOpportunitiesPayload(payload: unknown): MarketplaceOpportunity[] {
  const items = Array.isArray(payload) ? payload : [];
  if (items.length === 0) {
    return [];
  }

  const firstItem = items[0] as Record<string, unknown>;
  if (!Array.isArray(firstItem?.tranches)) {
    return items as MarketplaceOpportunity[];
  }

  const normalized: MarketplaceOpportunity[] = [];

  for (const rawDeal of items) {
    const deal = rawDeal as Record<string, unknown>;
    const dealId = asNumber(deal.dealId ?? deal.id);
    const dealName = asString(deal.dealName ?? deal.name);
    const dealStatus = asString(deal.dealStatus ?? deal.status);
    const startDate = asString(deal.startDate ?? deal.start_date);
    const endDate = asString(deal.endDate ?? deal.end_date);
    const dealLatitude = deal.latitude ?? deal.lat;
    const dealLongitude = deal.longitude ?? deal.lng;
    const tranches = Array.isArray(deal.tranches) ? deal.tranches : [];

    for (const rawTranche of tranches) {
      const tranche = rawTranche as Record<string, unknown>;
      const trancheId = asNumber(tranche.trancheId ?? tranche.id);
      const latitude = tranche.latitude ?? tranche.lat ?? dealLatitude;
      const longitude = tranche.longitude ?? tranche.lng ?? dealLongitude;

      normalized.push({
        id: asString(tranche.id, `${dealId}-${trancheId}`),
        dealId,
        dealName,
        dealStatus,
        trancheId,
        fundingState:
          tranche.fundingState === 'new' ? 'new' : 'partially_funded',
        trancheName: asString(tranche.trancheName ?? tranche.name),
        riskLevel: asString(tranche.riskLevel),
        expectedReturnPct: asNumber(tranche.expectedReturnPct),
        maxLoss: asNumber(tranche.maxLoss),
        durationMonths: asNumber(tranche.durationMonths),
        capitalRequired: asNumber(tranche.capitalRequired),
        committedCapital: asNumber(
          tranche.committedCapital ?? tranche.fundedAmount
        ),
        fundedAmount: asNumber(tranche.fundedAmount),
        pendingAmount: asNumber(tranche.pendingAmount),
        fundingProgressPct: asNumber(tranche.fundingProgressPct),
        startDate: asString(tranche.startDate, startDate),
        endDate: asString(tranche.endDate, endDate),
        lineOfBusiness: asOptionalString(
          tranche.lineOfBusiness ?? deal.lineOfBusiness
        ),
        peril: asOptionalString(
          tranche.peril ?? ((deal as any).portfolio ? (deal as any).portfolio.perilType : undefined)
        ),
        lineOfBusinessSubType: asOptionalString(
          tranche.lineOfBusinessSubType ?? deal.lineOfBusinessSubType
        ),
        latitude: Number.isFinite(Number(latitude))
          ? Number(latitude)
          : undefined,
        longitude: Number.isFinite(Number(longitude))
          ? Number(longitude)
          : undefined,
      });
    }
  }

  return normalized;
}

export function useMarketplaceOpportunities() {
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>(
    []
  );
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(
    null
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  // Only the very first load shows the loading state; periodic refreshes swap
  // data in place so the list doesn't flash every five minutes.
  const hasLoadedRef = useRef(false);

  const { load } = useActivePendingFundingLoader({
    onStart: () => {
      if (!hasLoadedRef.current) {
        setIsLoadingOpportunities(true);
      }
    },
    onSuccess: (data: unknown) => {
      if (!mountedRef.current) return;
      setOpportunities(normalizeOpportunitiesPayload(data));
      setOpportunitiesError(null);
      setLastUpdated(new Date());
    },
    onError: (error: unknown) => {
      if (!mountedRef.current) return;
      console.warn(
        `Marketplace opportunities fetch failed (endpoint: ${OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH}):`,
        error
      );
      if (!hasLoadedRef.current) {
        setOpportunities([]);
        setOpportunitiesError(
          'The live opportunities feed is unreachable right now. It retries automatically.'
        );
      }
    },
    onFinally: () => {
      if (mountedRef.current) {
        hasLoadedRef.current = true;
        setIsLoadingOpportunities(false);
      }
    },
  });

  useEffect(() => {
    mountedRef.current = true;
    load();

    const interval = window.setInterval(load, REFRESH_INTERVAL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return {
    opportunities,
    isLoadingOpportunities,
    opportunitiesError,
    lastUpdated,
    refetchOpportunities: load,
  };
}

// Live catastrophe events shared by the footer ticker, the market-signal card
// and (via its own layer) the map. Refreshes on the marketplace cadence.
export function useLiveRiskEvents(): LiveRiskEvent[] {
  const [events, setEvents] = useState<LiveRiskEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getActiveEvents<{ features?: Array<{ properties?: LiveRiskEvent }> }>()
        .then((data) => {
          if (cancelled) return;
          const items = (data?.features ?? [])
            .map((f) => f.properties)
            .filter((p): p is LiveRiskEvent => Boolean(p && p.title));
          setEvents(items);
        })
        .catch(() => {
          /* feed is optional — callers render their static fallback */
        });
    };

    load();
    const handle = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  return events;
}

export function useMarketplaceSummary(
  opportunities: MarketplaceOpportunity[]
): MarketplaceSummary {
  return useMemo(() => {
    const totalOpenCapacity = opportunities.reduce(
      (sum, item) => sum + item.pendingAmount,
      0
    );
    const totalFunded = opportunities.reduce(
      (sum, item) => sum + item.fundedAmount,
      0
    );
    const activeDeals = new Set(opportunities.map((item) => item.dealId)).size;

    return {
      totalOpenCapacity,
      totalFunded,
      activeDeals,
    };
  }, [opportunities]);
}

export function useAggregatedDeals(
  opportunities: MarketplaceOpportunity[]
): AggregatedDeal[] {
  return useMemo(() => {
    const map = new Map<number, Omit<AggregatedDeal, 'totalDealSize' | 'durationMonths'>>();

    for (const opportunity of opportunities) {
      const dealId = opportunity.dealId ?? 0;
      if (!map.has(dealId)) {
        map.set(dealId, {
          dealId,
          dealName: opportunity.dealName ?? '',
          dealStatus: opportunity.dealStatus ?? '',
          startDate: opportunity.startDate ?? '',
          endDate: opportunity.endDate ?? '',
          tranches: [],
        });
      }

      const groupedDeal = map.get(dealId);
      if (groupedDeal) {
        groupedDeal.tranches.push(opportunity);
      }
    }

    return Array.from(map.values()).map((deal) => {
      const totalDealSize = deal.tranches.reduce(
        (sum, tranche) => sum + (tranche.capitalRequired ?? 0),
        0
      );
      const durationMonths = deal.tranches.reduce(
        (max, tranche) => Math.max(max, tranche.durationMonths ?? 0),
        0
      );

      return { ...deal, totalDealSize, durationMonths };
    });
  }, [opportunities]);
}

export function useMarketplaceMapPoints(opportunities: MarketplaceOpportunity[]) {
  return useMemo(() => {
    const duplicateCounts = new Map<string, number>();
    const points: Array<{
      latitude: number;
      longitude: number;
      label?: string;
      id?: string;
    }> = [];

    for (const opportunity of opportunities) {
      const lat = Number(opportunity.latitude);
      const lng = Number(opportunity.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

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

      points.push({
        latitude: adjustedLat,
        longitude: adjustedLng,
        label: `${cleanDealName(opportunity.dealName)} • ${opportunity.trancheName}`,
        // Marker clicks resolve back to the owning deal card in the list.
        id: String(opportunity.dealId),
      });
    }

    return points;
  }, [opportunities]);
}

export function useMarketplaceLineOfBusinessTaxonomy() {
  const [primaryTypes, setPrimaryTypes] = useState<LineOfBusinessPrimaryType[]>(
    []
  );
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoadingTaxonomy(true);
    setTaxonomyError(null);

    const endpoint = TAXONOMY_PATH;

    getLineOfBusinessTaxonomyResponse()
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        return res.json();
      })
      .then((data: unknown) => {
        if (!mounted) {
          return;
        }

        const items = Array.isArray((data as any)?.primaryTypes)
          ? ((data as any).primaryTypes as any[])
          : [];

        const normalized = items.map((item) => ({
          code: asString(item?.code),
          label: asString(item?.label),
          subTypes: Array.isArray(item?.subTypes)
            ? item.subTypes.map((subType: any) => ({
                code: asString(subType?.code),
                label: asString(subType?.label),
              }))
            : [],
        }));

        setPrimaryTypes(normalized.filter((item) => item.code || item.label));
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        console.warn(`Taxonomy fetch failed (endpoint: ${endpoint}):`, error);
        setPrimaryTypes([]);
        setTaxonomyError('Line-of-business filters are unavailable right now.');
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingTaxonomy(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { primaryTypes, isLoadingTaxonomy, taxonomyError };
}