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
} from './marketplaceTypes';

export type MarketplaceSort = 'recent' | 'yield';
/** Deal-list density inside the canvas (card stack vs. dense table). */
export type MarketplaceViewMode = 'aggregated' | 'table';
/** Spatial arrangement of the explorer canvas. */
export type MarketplaceCanvasView = 'map' | 'list' | 'split';

/** Slider ceiling — at this value the duration filter is "any". */
export const DURATION_MONTHS_MAX = 36;
export const DURATION_MONTHS_MIN = 3;

export type MarketplaceFiltersState = {
  selectedLineOfBusiness: Set<string>;
  selectedSubTypes: Set<string>;
  selectedPerils: Set<string>;
  selectedGeographies: Set<string>;
  maxDurationMonths: number;
  yieldMin: string;
  yieldMax: string;
  query: string;
};

const QUERY_KEYS = {
  view: 'view',
  sort: 'sort',
  canvas: 'cv',
  filtersOpen: 'fp',
  query: 'q',
  maxDuration: 'dmax',
  yieldMin: 'ymin',
  yieldMax: 'ymax',
  perils: 'per',
  geo: 'geo',
  lineOfBusiness: 'lob',
  subTypes: 'sub',
  // dynamic config-driven filters serialized as JSON
  extraFilters: 'ef',
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
  primaryTypes: LineOfBusinessPrimaryType[],
  availablePerilKeys?: string[]
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
  const [canvasView, setCanvasView] = useState<MarketplaceCanvasView>(() => {
    const value = initialParams.get(QUERY_KEYS.canvas);
    return value === 'map' || value === 'list' ? value : 'split';
  });
  const [filtersOpen, setFiltersOpen] = useState<boolean>(
    () => initialParams.get(QUERY_KEYS.filtersOpen) !== '0'
  );
  const [query, setQuery] = useState<string>(
    () => initialParams.get(QUERY_KEYS.query) ?? ''
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
  const [selectedPerils, setSelectedPerils] = useState<Set<string>>(new Set());
  const [selectedGeographies, setSelectedGeographies] = useState<Set<string>>(new Set());
  // Dynamic, config-driven filter state (keyed by `field.id` from the manifest/config)
  const [extraFilters, setExtraFilters] = useState<Record<string, unknown>>(() => {
    try {
      const raw = initialParams.get(QUERY_KEYS.extraFilters);
      if (!raw) return {};
      return JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      return {};
    }
  });
  // Until the taxonomy arrives the selection sets are placeholders; don't
  // treat them as "user deselected everything" (or echo them into the URL).
  const [taxonomyApplied, setTaxonomyApplied] = useState(false);
  const [perilsApplied, setPerilsApplied] = useState(false);

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

  // Seed the selected perils when the system peril list becomes available.
  useEffect(() => {
    if (!availablePerilKeys || availablePerilKeys.length === 0) return;

    const urlPerils = parseCsvParam(initialParams.get(QUERY_KEYS.perils));
    setSelectedPerils(
      new Set(
        urlPerils ? availablePerilKeys.filter((key) => urlPerils.includes(key)) : availablePerilKeys
      )
    );
    setPerilsApplied(true);
  }, [availablePerilKeys, initialParams]);

  // Seed selected geographies from URL if present (comma-separated entries).
  useEffect(() => {
    const urlGeo = parseCsvParam(initialParams.get(QUERY_KEYS.geo));
    setSelectedGeographies(new Set(urlGeo ? urlGeo : []));
  }, [initialParams]);

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
    setOrDelete(QUERY_KEYS.canvas, canvasView !== 'split' ? canvasView : null);
    setOrDelete(QUERY_KEYS.filtersOpen, filtersOpen ? null : '0');
    setOrDelete(QUERY_KEYS.query, query.trim() ? query.trim() : null);
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

    if (perilsApplied && availablePerilKeys && availablePerilKeys.length > 0) {
      setOrDelete(
        QUERY_KEYS.perils,
        selectedPerils.size < availablePerilKeys.length ? [...selectedPerils].join(',') : null
      );
    }
    // Geography selections (encoded entries such as 'US', 'US/Florida/Tampa')
    setOrDelete(QUERY_KEYS.geo, selectedGeographies.size > 0 ? [...selectedGeographies].join(',') : null);

    // Serialize dynamic config-driven filters into a single compact JSON query param
    try {
      setOrDelete(
        QUERY_KEYS.extraFilters,
        Object.keys(extraFilters).length > 0 ? encodeURIComponent(JSON.stringify(extraFilters)) : null
      );
    } catch (e) {
      // ignore serialization errors — do not persist
      setOrDelete(QUERY_KEYS.extraFilters, null);
    }

    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [
    viewMode,
    sort,
    canvasView,
    filtersOpen,
    query,
    maxDurationMonths,
    yieldMin,
    yieldMax,
    selectedLineOfBusiness,
    selectedSubTypes,
    taxonomyApplied,
    primaryTypes,
    perilsApplied,
    selectedPerils,
    availablePerilKeys,
    selectedGeographies,
    extraFilters,
  ]);

  const filters: MarketplaceFiltersState = {
    selectedLineOfBusiness,
    selectedSubTypes,
    selectedPerils,
    selectedGeographies,
    maxDurationMonths,
    yieldMin,
    yieldMax,
    query,
  };

  return {
    viewMode,
    setViewMode,
    sort,
    setSort,
    canvasView,
    setCanvasView,
    filtersOpen,
    setFiltersOpen,
    query,
    setQuery,
    filters,
    taxonomyApplied,
    perilsApplied,
    setSelectedLineOfBusiness,
    setSelectedSubTypes,
    setSelectedPerils,
    setSelectedGeographies,
    setMaxDurationMonths,
    setYieldMin,
    setYieldMax,
    // Dynamic config-driven filters
    extraFilters,
    setExtraFilters,
    setExtraFilter: (key: string, value: unknown) => {
      setExtraFilters((prev) => {
        const next = { ...prev } as Record<string, unknown>;
        // remove empty-ish values
        const isEmpty = (v: unknown) => {
          if (v === null || v === undefined) return true;
          if (typeof v === 'string') return v.trim() === '';
          if (Array.isArray(v)) return v.length === 0;
          if (v instanceof Set) return v.size === 0;
          if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length === 0;
          return false;
        };
        const normalize = (v: unknown) => (v instanceof Set ? Array.from(v) : v);
        if (isEmpty(value)) {
          delete next[key];
        } else {
          next[key] = normalize(value);
        }
        return next;
      });
    },
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
  taxonomyApplied: boolean,
  availablePerilKeys?: string[]
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
  const normalizedQuery = filters.query.trim().toLowerCase();

  const perilsActive =
    Boolean(availablePerilKeys && availablePerilKeys.length > 0) &&
    filters.selectedPerils.size < (availablePerilKeys?.length ?? 0);

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

    if (normalizedQuery) {
      const haystack = `${opportunity.dealName ?? ''} ${
        opportunity.lineOfBusiness ?? ''
      } ${opportunity.trancheName ?? ''}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    if (perilsActive) {
      // Opportunities lacking peril metadata are excluded when a peril filter is active.
      if (!opportunity.peril || !filters.selectedPerils.has(opportunity.peril)) {
        return false;
      }
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
