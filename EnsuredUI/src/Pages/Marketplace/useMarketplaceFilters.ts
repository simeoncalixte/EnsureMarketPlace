// Page-level marketplace view state: contract-property filters, sort order,
// deal view mode and map visibility. The state lives here (not inside the
// filter sidebar) so one source of truth drives the deals list, the stat
// cards and the map markers alike — and it round-trips through the URL query
// string so a filtered view can be shared or refreshed without losing state.
//
// URL sync deliberately uses history.replaceState rather than react-router so
// the page also works in router-less hosts (Storybook).
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LineOfBusinessPrimaryType,
  MarketplaceOpportunity,
} from './useMarketplaceData';

export type MarketplaceSort = 'recent' | 'yield';
export type MarketplaceViewMode = 'aggregated' | 'table';

/** Slider ceiling — at this value the duration filter is "any". */
export const DURATION_MONTHS_MAX = 36;
export const DURATION_MONTHS_MIN = 3;

export type MarketplaceFiltersState = {
  selectedLineOfBusiness: Set<string>;
  selectedSubTypes: Set<string>;
  maxDurationMonths: number;
  yieldMin: string;
  yieldMax: string;
};

const QUERY_KEYS = {
  view: 'view',
  sort: 'sort',
  map: 'map',
  maxDuration: 'dmax',
  yieldMin: 'ymin',
  yieldMax: 'ymax',
  lineOfBusiness: 'lob',
  subTypes: 'sub',
} as const;

export function primaryTypeKey(primaryType: LineOfBusinessPrimaryType): string {
  return primaryType.code || primaryType.label;
}

export function subTypeKey(
  primaryType: LineOfBusinessPrimaryType,
  subType: { code: string; label: string }
): string {
  return `${primaryType.code}:${subType.code}`;
}

function allPrimaryKeys(primaryTypes: LineOfBusinessPrimaryType[]): string[] {
  return primaryTypes.map(primaryTypeKey);
}

function allSubTypeKeys(primaryTypes: LineOfBusinessPrimaryType[]): string[] {
  return primaryTypes.flatMap((primaryType) =>
    primaryType.subTypes.map((subType) => subTypeKey(primaryType, subType))
  );
}

function readSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function parseCsvParam(value: string | null): string[] | null {
  if (value === null) {
    return null;
  }
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function useMarketplaceViewState(
  primaryTypes: LineOfBusinessPrimaryType[]
) {
  // Snapshot the URL once on mount; later URL writes flow from state.
  const initialParamsRef = useRef<URLSearchParams | null>(null);
  if (initialParamsRef.current === null) {
    initialParamsRef.current = readSearchParams();
  }
  const initialParams = initialParamsRef.current;

  const [viewMode, setViewMode] = useState<MarketplaceViewMode>(() =>
    initialParams.get(QUERY_KEYS.view) === 'table' ? 'table' : 'aggregated'
  );
  const [sort, setSort] = useState<MarketplaceSort>(() =>
    initialParams.get(QUERY_KEYS.sort) === 'yield' ? 'yield' : 'recent'
  );
  const [showMap, setShowMap] = useState<boolean>(
    () => initialParams.get(QUERY_KEYS.map) !== '0'
  );
  const [maxDurationMonths, setMaxDurationMonths] = useState<number>(() => {
    const parsed = Number(initialParams.get(QUERY_KEYS.maxDuration));
    return Number.isFinite(parsed) && parsed >= DURATION_MONTHS_MIN
      ? Math.min(parsed, DURATION_MONTHS_MAX)
      : DURATION_MONTHS_MAX;
  });
  const [yieldMin, setYieldMin] = useState<string>(
    () => initialParams.get(QUERY_KEYS.yieldMin) ?? ''
  );
  const [yieldMax, setYieldMax] = useState<string>(
    () => initialParams.get(QUERY_KEYS.yieldMax) ?? ''
  );
  const [selectedLineOfBusiness, setSelectedLineOfBusiness] = useState<
    Set<string>
  >(new Set());
  const [selectedSubTypes, setSelectedSubTypes] = useState<Set<string>>(
    new Set()
  );
  // Until the taxonomy arrives the selection sets are placeholders; don't
  // treat them as "user deselected everything" (or echo them into the URL).
  const [taxonomyApplied, setTaxonomyApplied] = useState(false);

  // Seed the selection sets when the taxonomy loads: from the URL when the
  // shared link carried a selection, otherwise everything selected.
  useEffect(() => {
    if (primaryTypes.length === 0) {
      return;
    }

    const primaryKeys = allPrimaryKeys(primaryTypes);
    const subKeys = allSubTypeKeys(primaryTypes);
    const urlLineOfBusiness = parseCsvParam(
      initialParams.get(QUERY_KEYS.lineOfBusiness)
    );
    const urlSubTypes = parseCsvParam(initialParams.get(QUERY_KEYS.subTypes));

    setSelectedLineOfBusiness(
      new Set(
        urlLineOfBusiness
          ? primaryKeys.filter((key) => urlLineOfBusiness.includes(key))
          : primaryKeys
      )
    );
    setSelectedSubTypes(
      new Set(
        urlSubTypes ? subKeys.filter((key) => urlSubTypes.includes(key)) : subKeys
      )
    );
    setTaxonomyApplied(true);
  }, [primaryTypes, initialParams]);

  // Reflect the current state into the query string (replace, not push — the
  // browser back button should leave the page, not unwind filter toggles).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key: string, value: string | null) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    setOrDelete(QUERY_KEYS.view, viewMode === 'table' ? 'table' : null);
    setOrDelete(QUERY_KEYS.sort, sort === 'yield' ? 'yield' : null);
    setOrDelete(QUERY_KEYS.map, showMap ? null : '0');
    setOrDelete(
      QUERY_KEYS.maxDuration,
      maxDurationMonths < DURATION_MONTHS_MAX ? String(maxDurationMonths) : null
    );
    setOrDelete(QUERY_KEYS.yieldMin, yieldMin.trim() ? yieldMin.trim() : null);
    setOrDelete(QUERY_KEYS.yieldMax, yieldMax.trim() ? yieldMax.trim() : null);

    if (taxonomyApplied) {
      const primaryKeys = allPrimaryKeys(primaryTypes);
      const subKeys = allSubTypeKeys(primaryTypes);
      setOrDelete(
        QUERY_KEYS.lineOfBusiness,
        selectedLineOfBusiness.size < primaryKeys.length
          ? [...selectedLineOfBusiness].join(',')
          : null
      );
      setOrDelete(
        QUERY_KEYS.subTypes,
        selectedSubTypes.size < subKeys.length
          ? [...selectedSubTypes].join(',')
          : null
      );
    }

    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [
    viewMode,
    sort,
    showMap,
    maxDurationMonths,
    yieldMin,
    yieldMax,
    selectedLineOfBusiness,
    selectedSubTypes,
    taxonomyApplied,
    primaryTypes,
  ]);

  const filters: MarketplaceFiltersState = {
    selectedLineOfBusiness,
    selectedSubTypes,
    maxDurationMonths,
    yieldMin,
    yieldMax,
  };

  return {
    viewMode,
    setViewMode,
    sort,
    setSort,
    showMap,
    setShowMap,
    filters,
    taxonomyApplied,
    setSelectedLineOfBusiness,
    setSelectedSubTypes,
    setMaxDurationMonths,
    setYieldMin,
    setYieldMax,
  };
}

/**
 * Apply the contract-property filters and sort order to the raw opportunity
 * list. Everything downstream (stats, aggregated deals, table rows, map
 * markers) derives from this result, so the whole page answers to one filter
 * state.
 */
export function applyMarketplaceFilters(
  opportunities: MarketplaceOpportunity[],
  primaryTypes: LineOfBusinessPrimaryType[],
  filters: MarketplaceFiltersState,
  sort: MarketplaceSort,
  taxonomyApplied: boolean
): MarketplaceOpportunity[] {
  const primaryKeys = allPrimaryKeys(primaryTypes);
  const subKeys = allSubTypeKeys(primaryTypes);

  // A taxonomy filter is "active" only once the user deselected something;
  // with everything selected, opportunities without LOB metadata still show.
  const lineOfBusinessActive =
    taxonomyApplied && filters.selectedLineOfBusiness.size < primaryKeys.length;
  const subTypesActive =
    taxonomyApplied && filters.selectedSubTypes.size < subKeys.length;

  const primaryKeyByLabel = new Map<string, string>();
  const subKeyByLabels = new Map<string, string>();
  for (const primaryType of primaryTypes) {
    const key = primaryTypeKey(primaryType);
    primaryKeyByLabel.set(primaryType.label.toLowerCase(), key);
    primaryKeyByLabel.set(primaryType.code.toLowerCase(), key);
    for (const subType of primaryType.subTypes) {
      const subKey = subTypeKey(primaryType, subType);
      subKeyByLabels.set(`${key}|${subType.label.toLowerCase()}`, subKey);
      subKeyByLabels.set(`${key}|${subType.code.toLowerCase()}`, subKey);
    }
  }

  const yieldMin = Number.parseFloat(filters.yieldMin);
  const yieldMax = Number.parseFloat(filters.yieldMax);
  const durationCapped = filters.maxDurationMonths < DURATION_MONTHS_MAX;

  const filtered = opportunities.filter((opportunity) => {
    const primaryKey = opportunity.lineOfBusiness
      ? primaryKeyByLabel.get(opportunity.lineOfBusiness.toLowerCase())
      : undefined;

    if (lineOfBusinessActive) {
      if (!primaryKey || !filters.selectedLineOfBusiness.has(primaryKey)) {
        return false;
      }
    }

    if (subTypesActive) {
      const subKey =
        primaryKey && opportunity.lineOfBusinessSubType
          ? subKeyByLabels.get(
              `${primaryKey}|${opportunity.lineOfBusinessSubType.toLowerCase()}`
            )
          : undefined;
      if (!subKey || !filters.selectedSubTypes.has(subKey)) {
        return false;
      }
    }

    if (durationCapped && opportunity.durationMonths > filters.maxDurationMonths) {
      return false;
    }

    if (Number.isFinite(yieldMin) && opportunity.expectedReturnPct < yieldMin) {
      return false;
    }
    if (Number.isFinite(yieldMax) && opportunity.expectedReturnPct > yieldMax) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];
  if (sort === 'yield') {
    sorted.sort((a, b) => b.expectedReturnPct - a.expectedReturnPct);
  } else {
    // 'recent': newest inception first; ISO date strings compare lexically.
    sorted.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }

  return sorted;
}
