import { useEffect, useMemo, useState } from 'react';
import {
  getActivePendingFunding,
  getLineOfBusinessTaxonomyResponse,
  OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH,
} from '../../api/marketplace';

const TAXONOMY_PATH = '/api/marketplace/line-of-business-taxonomy';

export type MarketplaceOpportunity = {
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
  lineOfBusiness?: string;
  lineOfBusinessSubType?: string;
  latitude?: number;
  longitude?: number;
};

export type AggregatedDeal = {
  dealId: number;
  dealName: string;
  dealStatus: string;
  startDate: string;
  endDate: string;
  tranches: MarketplaceOpportunity[];
  totalDealSize: number;
  durationMonths: number;
};

export type LineOfBusinessSubType = {
  code: string;
  label: string;
};

export type LineOfBusinessPrimaryType = {
  code: string;
  label: string;
  subTypes: LineOfBusinessSubType[];
};

type MarketplaceSummary = {
  totalOpenCapacity: number;
  totalFunded: number;
  activeDeals: number;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

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

  useEffect(() => {
    let mounted = true;
    setIsLoadingOpportunities(true);
    setOpportunitiesError(null);

    const endpoint = OPPORTUNITIES_ACTIVE_PENDING_FUNDING_PATH;

    getActivePendingFunding()
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

        setOpportunities(normalizeOpportunitiesPayload(data));
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setOpportunities([]);
        setOpportunitiesError(
          `${String(error?.message || error)} (endpoint: ${endpoint})`
        );
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

  return { opportunities, isLoadingOpportunities, opportunitiesError };
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
    const points: Array<{ latitude: number; longitude: number; label?: string }> = [];

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
        label: `${opportunity.dealName} • ${opportunity.trancheName}`,
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

        setPrimaryTypes([]);
        setTaxonomyError(
          `${String(error?.message || error)} (endpoint: ${endpoint})`
        );
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