import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  MarketplaceActiveFilters,
  MarketplaceDealsSection,
  MarketplaceExplorerToolbar,
  MarketplaceFooterSection,
  MarketplaceMapSection,
  MarketplaceStatsSection,
  type ActiveFilterChip,
} from './Marketplace.sections';
import MarketplaceFilterDock from './FilterDock/MarketplaceFilterDock';
import type { FiltersConfig } from './FilterDock/FilterRenderer';
import { ExplorerCard, ExplorerBody, ExplorerCanvas } from './Marketplace.styles';
import {
  getUserPreference,
  putUserPreference,
  MAP_SUBMISSION_TYPE_COLORS_KEY,
} from '../../api/userPreferences';
import { getJson } from '../../api/client';
import type { SubmissionsMapFiltersQuery } from '../../api/submissionsMap';
import {
  useAggregatedDeals,
  useLiveRiskEvents,
  useMarketplaceLineOfBusinessTaxonomy,
  useMarketplaceMapPoints,
  useMarketplaceOpportunities,
  useMarketplaceSummary,
} from './useMarketplaceData';
import { listEntityOptions } from '../../api/fieldOptions';
import { useAuthMe } from '../../lib/useAuthMe';
import {
  applyMarketplaceFilters,
  useMarketplaceViewState,
  primaryTypeKey,
  subTypeKey,
  DURATION_MONTHS_MAX,
} from './useMarketplaceFilters';
import { toMarketplaceTableRows } from './Marketplace.utils';
import { MAP_LAYERS, type MapLayerFetchContext } from '../../xds/components/mapLayers';
import {
  SUBMISSION_TYPE_PALETTE,
  resolveSubmissionTypeColors,
} from '../../xds/components/submissionTypes';
import { DEFAULT_MARKETPLACE_FILTERS_CONFIG } from './FilterDock/defaultMarketplaceFiltersConfig';

const THREE_D_LAYER = '__3d';
import type { SurfaceRegistry, WidgetRenderContext } from '../../dashboards/registry';
import CustomMetricWidget from '../../dashboards/CustomMetricWidget';
import type { MetricDefinition } from '../../dashboards/metricTypes';

type SubmissionTypeTreeProps = {
  selected: Set<string>;
  onToggleType: (code: string) => void;
  onSetDomainSelected: (codes: string[], selected: boolean) => void;
  typeColors: Record<string, string>;
  onSetColor: (code: string, hex: string) => void;
  onResetColors: () => void;
  palette: string[];
};

const SubmissionTypeTree: React.FC<SubmissionTypeTreeProps> = () => null;

// The Marketplace surface keeps the original page's shared filter/map/view state
// in one provider, so the (separately placeable) Stats, Explorer and Footer
// widgets stay in lock-step. The filter + map + deals trio is intentionally one
// composite "Explorer" widget rather than three tiles: they share interactive
// state that would be incoherent to split across a freeform grid.

type MarketplaceContextValue = ReturnType<typeof useMarketplaceState>;

type FilterOption = { value: string; label: string };

type MarketplaceFiltersManifest = {
  config?: FiltersConfig;
  data?: Record<string, FilterOption[]>;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function useMarketplaceCtx(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('Marketplace widgets must render inside MarketplaceDataProvider');
  return ctx;
}

function toStringArray(raw: unknown): string[] | undefined {
  const values =
    raw instanceof Set
      ? Array.from(raw)
      : Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
      ? [raw]
      : [];
  const normalized = values.map((entry) => String(entry).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function toFiniteNumber(raw: unknown): number | undefined {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function useMarketplaceState() {
  const { opportunities, isLoadingOpportunities, opportunitiesError, lastUpdated } = useMarketplaceOpportunities();
  const { primaryTypes, isLoadingTaxonomy, taxonomyError } = useMarketplaceLineOfBusinessTaxonomy();
  const events = useLiveRiskEvents();

  // Load the global peril taxonomy (entity 'peril'). It's tenant-visible
  // via the field-options entity endpoint; allow org 0 for platform defaults.
  const { user } = useAuthMe();
  const organizationId = user?.organizationId ?? 0;
  const [perilOptions, setPerilOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingPerils, setIsLoadingPerils] = useState(true);
  const [perilsError, setPerilsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoadingPerils(true);
    setPerilsError(null);
    listEntityOptions(organizationId, 'peril')
      .then((res) => {
        if (!mounted) return;
        setPerilOptions((res.items ?? []).map((i) => ({ value: String(i.value), label: i.label })));
      })
      .catch((err) => {
        if (!mounted) return;
        setPerilOptions([]);
        setPerilsError('Failed to load perils');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingPerils(false);
      });
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const perilKeys = useMemo(() => perilOptions.map((p) => p.value), [perilOptions]);
  const allPrimaryKeys = useMemo(() => primaryTypes.map(primaryTypeKey), [primaryTypes]);
  const allSubKeys = useMemo(
    () =>
      primaryTypes.flatMap((primaryType) =>
        primaryType.subTypes.map((subType) => subTypeKey(primaryType, subType))
      ),
    [primaryTypes]
  );
  const allPerilKeys = perilKeys;
  const view = useMarketplaceViewState(primaryTypes, perilKeys);

  const [filtersConfig, setFiltersConfig] = useState<FiltersConfig>(DEFAULT_MARKETPLACE_FILTERS_CONFIG);
  const [filterPreloadedData, setFilterPreloadedData] = useState<Record<string, FilterOption[]>>({});

  useEffect(() => {
    let mounted = true;
    getJson<MarketplaceFiltersManifest>('/api/marketplace/filters/manifest')
      .then((manifest) => {
        if (!mounted) return;
        setFiltersConfig(manifest?.config ?? DEFAULT_MARKETPLACE_FILTERS_CONFIG);
        setFilterPreloadedData(manifest?.data ?? {});
      })
      .catch(() => {
        if (!mounted) return;
        setFiltersConfig(DEFAULT_MARKETPLACE_FILTERS_CONFIG);
        setFilterPreloadedData({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  

  const filteredOpportunities = useMemo(
    () => applyMarketplaceFilters(opportunities, primaryTypes, view.filters, view.sort, view.taxonomyApplied, perilKeys),
    [opportunities, primaryTypes, view.filters, view.sort, view.taxonomyApplied, perilKeys],
  );

  const mapFetchContext = useMemo<MapLayerFetchContext>(() => {
    const extraFilters = view.extraFilters ?? {};
    const catScore =
      extraFilters.catScore && typeof extraFilters.catScore === 'object'
        ? (extraFilters.catScore as { min?: unknown; max?: unknown })
        : {};
    const tiv =
      extraFilters.tiv && typeof extraFilters.tiv === 'object'
        ? (extraFilters.tiv as { min?: unknown; max?: unknown })
        : {};
    const limit =
      extraFilters.limit && typeof extraFilters.limit === 'object'
        ? (extraFilters.limit as { min?: unknown; max?: unknown })
        : {};
    const attachment =
      extraFilters.attachment && typeof extraFilters.attachment === 'object'
        ? (extraFilters.attachment as { min?: unknown; max?: unknown })
        : {};
    const lobActive = view.taxonomyApplied && view.filters.selectedLineOfBusiness.size < allPrimaryKeys.length;
    const subActive = view.taxonomyApplied && view.filters.selectedSubTypes.size < allSubKeys.length;
    const perilActive = view.filters.selectedPerils.size < allPerilKeys.length;
    const geographyActive = view.filters.selectedGeographies.size > 0;

    const submissionsFilters: SubmissionsMapFiltersQuery = {
      lob: lobActive ? Array.from(view.filters.selectedLineOfBusiness) : undefined,
      sub: subActive ? Array.from(view.filters.selectedSubTypes) : undefined,
      peril: perilActive ? Array.from(view.filters.selectedPerils) : undefined,
      geography: geographyActive ? Array.from(view.filters.selectedGeographies) : undefined,
      tivMin: toFiniteNumber(tiv.min),
      tivMax: toFiniteNumber(tiv.max),
      limitMin: toFiniteNumber(limit.min),
      limitMax: toFiniteNumber(limit.max),
      attachmentMin: toFiniteNumber(attachment.min),
      attachmentMax: toFiniteNumber(attachment.max),
      broker: toStringArray(extraFilters.broker),
      carrier: toStringArray(extraFilters.carrier),
      submissionStatus: toStringArray(extraFilters.submissionStatus),
      catPeril: toStringArray(extraFilters.catPeril),
      catBand: toStringArray(extraFilters.catBand),
      catModelVersion: toStringArray(extraFilters.catModelVersion),
      catRecommendedAction: toStringArray(extraFilters.catRecommendedAction),
      catScoreMin: toFiniteNumber(catScore.min),
      catScoreMax: toFiniteNumber(catScore.max),
    };

    const hasActiveFilters =
      (submissionsFilters.broker?.length ?? 0) > 0 ||
      (submissionsFilters.carrier?.length ?? 0) > 0 ||
      (submissionsFilters.submissionStatus?.length ?? 0) > 0 ||
      (submissionsFilters.lob?.length ?? 0) > 0 ||
      (submissionsFilters.sub?.length ?? 0) > 0 ||
      (submissionsFilters.peril?.length ?? 0) > 0 ||
      (submissionsFilters.geography?.length ?? 0) > 0 ||
      Number.isFinite(submissionsFilters.tivMin) ||
      Number.isFinite(submissionsFilters.tivMax) ||
      Number.isFinite(submissionsFilters.limitMin) ||
      Number.isFinite(submissionsFilters.limitMax) ||
      Number.isFinite(submissionsFilters.attachmentMin) ||
      Number.isFinite(submissionsFilters.attachmentMax) ||
      (submissionsFilters.catPeril?.length ?? 0) > 0 ||
      (submissionsFilters.catBand?.length ?? 0) > 0 ||
      (submissionsFilters.catModelVersion?.length ?? 0) > 0 ||
      (submissionsFilters.catRecommendedAction?.length ?? 0) > 0 ||
      Number.isFinite(submissionsFilters.catScoreMin) ||
      Number.isFinite(submissionsFilters.catScoreMax);

    return hasActiveFilters ? { submissionsFilters } : {};
  }, [
    allPerilKeys.length,
    allPrimaryKeys.length,
    allSubKeys.length,
    view.extraFilters,
    view.filters.selectedGeographies,
    view.filters.selectedLineOfBusiness,
    view.filters.selectedPerils,
    view.filters.selectedSubTypes,
    view.taxonomyApplied,
  ]);

  const summary = useMarketplaceSummary(filteredOpportunities);
  const overallSummary = useMarketplaceSummary(opportunities);
  const deals = useAggregatedDeals(filteredOpportunities);
  const mapPoints = useMarketplaceMapPoints(filteredOpportunities);
  const tableRows = useMemo(() => toMarketplaceTableRows(filteredOpportunities), [filteredOpportunities]);

  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l.defaultEnabled])),
  );
  const [layerFacets, setLayerFacets] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(MAP_LAYERS.filter((l) => l.filter).map((l) => [l.id, l.filter!.options.map((o) => o.value)])),
  );
  const [layerCounts, setLayerCounts] = useState<Record<string, number | null>>({});
  const [is3D, setIs3D] = useState(false);
  const [highlightedDealId, setHighlightedDealId] = useState<string | null>(null);

  const toggleLayer = (layerId: string) => setLayersEnabled((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  const toggleLayerFacet = (layerId: string, value: string) =>
    setLayerFacets((prev) => {
      const current = prev[layerId] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [layerId]: next };
    });
  // Bulk toggle (e.g. a whole domain's worth of submission types) at once.
  const setLayerFacetValues = (layerId: string, values: string[], on: boolean) =>
    setLayerFacets((prev) => {
      const next = new Set(prev[layerId] ?? []);
      values.forEach((v) => (on ? next.add(v) : next.delete(v)));
      return { ...prev, [layerId]: [...next] };
    });

  // Per-user submission-type colour overrides ({} = use defaults), loaded from
  // and saved to the user's account so the map palette follows them across devices.
  const [submissionTypeColors, setSubmissionTypeColors] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    getUserPreference<Record<string, string>>(MAP_SUBMISSION_TYPE_COLORS_KEY)
      .then((res) => {
        if (active && res.value && typeof res.value === 'object') setSubmissionTypeColors(res.value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const persistColors = (next: Record<string, string>) => {
    setSubmissionTypeColors(next);
    void putUserPreference(MAP_SUBMISSION_TYPE_COLORS_KEY, next).catch(() => undefined);
  };
  const setSubmissionTypeColor = (code: string, hex: string) =>
    persistColors({ ...submissionTypeColors, [code]: hex });
  const resetSubmissionTypeColors = () => persistColors({});
  const layerColors = useMemo(
    () => ({ submissions: submissionTypeColors }),
    [submissionTypeColors],
  );

  const mapLayerControls = {
    layersEnabled,
    onToggleLayer: toggleLayer,
    layerFacets,
    onToggleLayerFacet: toggleLayerFacet,
    layerCounts,
    is3D,
    onToggle3D: () => setIs3D((s) => !s),
  };

  return {
    opportunities,
    isLoadingOpportunities,
    opportunitiesError,
    lastUpdated,
    primaryTypes,
    isLoadingTaxonomy,
    taxonomyError,
    events,
    view,
    filtersConfig,
    filterPreloadedData,
    filteredOpportunities,
    summary,
    overallSummary,
    deals,
    mapPoints,
    mapFetchContext,
    tableRows,
    mapLayerControls,
    highlightedDealId,
    setHighlightedDealId,
    setLayerCounts,
    setLayerFacetValues,
    submissionTypeColors,
    setSubmissionTypeColor,
    resetSubmissionTypeColors,
    layerColors,
    perilOptions,
    isLoadingPerils,
    perilsError,
  };
}

export function MarketplaceDataProvider({ children }: { children: React.ReactNode }) {
  const value = useMarketplaceState();
  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

// ─── Widgets ────────────────────────────────────────────────────────────────────
function StatsWidget({ settings, editContext }: { settings: Record<string, unknown>; editContext?: WidgetRenderContext }) {
  const { summary } = useMarketplaceCtx();
  return (
    <MarketplaceStatsSection
      summary={summary}
      settings={settings}
      editing={editContext?.editing}
      onEditCard={(card) => editContext?.openSettings(`card${card}`)}
    />
  );
}

function ExplorerWidget() {
  const ctx = useMarketplaceCtx();
  const {
    view,
    primaryTypes,
    perilOptions,
    filtersConfig,
    filterPreloadedData,
    mapLayerControls,
  } = ctx;
  const { layersEnabled, is3D } = mapLayerControls;

  // Normalize FilterRenderer's arbitrary state (convert Sets → Arrays,
  // drop empty values) so it can be persisted in the page view state.
  const normalizeRendererState = (raw: Record<string, unknown> | null | undefined) => {
    const out: Record<string, unknown> = {};
    if (!raw) return out;
    for (const [k, v] of Object.entries(raw)) {
      let val = v as unknown;
      if (val instanceof Set) val = Array.from(val as Set<unknown>);
      const isEmpty =
        val === null ||
        val === undefined ||
        (typeof val === 'string' && (val as string).trim() === '') ||
        (Array.isArray(val) && (val as unknown[]).length === 0) ||
        (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as Record<string, unknown>).length === 0);
      if (!isEmpty) out[k] = val;
    }
    return out;
  };

  const toStringSet = (raw: unknown): Set<string> => {
    if (raw instanceof Set) {
      return new Set(Array.from(raw).map((entry) => String(entry)));
    }
    if (Array.isArray(raw)) {
      return new Set(raw.map((entry) => String(entry)));
    }
    if (typeof raw === 'string' && raw.trim()) {
      return new Set([raw.trim()]);
    }
    return new Set();
  };

  // The map-layer MultiSelect mirrors the registry plus a synthetic 3D toggle.
  const mapLayerOptions = useMemo(
    () => [
      ...MAP_LAYERS.map((layer) => ({ value: layer.id, label: layer.label })),
      { value: THREE_D_LAYER, label: '3D buildings' },
    ],
    []
  );
  const selectedLayers = useMemo(() => {
    const set = new Set<string>();
    for (const layer of MAP_LAYERS) {
      if (layersEnabled[layer.id] ?? layer.defaultEnabled) set.add(layer.id);
    }
    if (is3D) set.add(THREE_D_LAYER);
    return set;
  }, [layersEnabled, is3D]);
  const toggleLayer = (value: string) => {
    if (value === THREE_D_LAYER) mapLayerControls.onToggle3D();
    else mapLayerControls.onToggleLayer(value);
  };
  const resetLayers = () => {
    for (const layer of MAP_LAYERS) {
      const on = layersEnabled[layer.id] ?? layer.defaultEnabled;
      if (on !== layer.defaultEnabled) mapLayerControls.onToggleLayer(layer.id);
    }
    if (is3D) mapLayerControls.onToggle3D();
  };

  // Active-filter chips: one per non-default dimension, each removable.
  const allPrimaryKeys = useMemo(() => primaryTypes.map(primaryTypeKey), [primaryTypes]);
  const allSubKeys = useMemo(
    () =>
      primaryTypes.flatMap((primaryType) =>
        primaryType.subTypes.map((subType) => subTypeKey(primaryType, subType))
      ),
    [primaryTypes]
  );
  const allPerilKeys = useMemo(() => perilOptions.map((option) => option.value), [perilOptions]);
  const coreFilterKeys = useMemo(
    () => new Set(['lob', 'sub', 'peril', 'geography', 'yield', 'maxDurationMonths']),
    []
  );

  const dockPreloadedData = useMemo(() => {
    const fallbackPrimaryTypes = primaryTypes.map((primaryType) => ({
      value: primaryTypeKey(primaryType),
      label: primaryType.label,
    }));
    const fallbackSubTypes = primaryTypes.flatMap((primaryType) =>
      primaryType.subTypes.map((subType) => ({
        value: subTypeKey(primaryType, subType),
        label: `${primaryType.label} - ${subType.label}`,
      }))
    );
    return {
      ...filterPreloadedData,
      primaryTypes: filterPreloadedData.primaryTypes ?? fallbackPrimaryTypes,
      subTypes: filterPreloadedData.subTypes ?? fallbackSubTypes,
      perils: filterPreloadedData.perils ?? perilOptions,
    };
  }, [filterPreloadedData, perilOptions, primaryTypes]);

  const dockFilterValues = useMemo(() => {
    const next: Record<string, unknown> = { ...(view.extraFilters ?? {}) };
    next.lob = new Set(view.filters.selectedLineOfBusiness);
    next.sub = new Set(view.filters.selectedSubTypes);
    next.peril = new Set(view.filters.selectedPerils);
    next.geography = new Set(view.filters.selectedGeographies);
    next.yield = { min: view.filters.yieldMin, max: view.filters.yieldMax };
    next.maxDurationMonths = view.filters.maxDurationMonths;
    return next;
  }, [
    view.extraFilters,
    view.filters.selectedLineOfBusiness,
    view.filters.selectedPerils,
    view.filters.selectedSubTypes,
    view.filters.selectedGeographies,
    view.filters.yieldMin,
    view.filters.yieldMax,
    view.filters.maxDurationMonths,
  ]);

  const onDockFilterValuesChange = (nextState: Record<string, unknown>) => {
    const normalized = normalizeRendererState(nextState);
    const dynamicOnly = Object.fromEntries(
      Object.entries(normalized).filter(([key]) => !coreFilterKeys.has(key))
    );
    view.setExtraFilters(dynamicOnly);

    if (Object.prototype.hasOwnProperty.call(nextState, 'lob')) {
      view.setSelectedLineOfBusiness(toStringSet(nextState.lob));
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'sub')) {
      view.setSelectedSubTypes(toStringSet(nextState.sub));
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'peril')) {
      view.setSelectedPerils(toStringSet(nextState.peril));
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'geography')) {
      view.setSelectedGeographies(toStringSet(nextState.geography));
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'yield')) {
      const nextYield =
        typeof nextState.yield === 'object' && nextState.yield !== null
          ? (nextState.yield as { min?: unknown; max?: unknown })
          : {};
      view.setYieldMin(typeof nextYield.min === 'string' ? nextYield.min : String(nextYield.min ?? ''));
      view.setYieldMax(typeof nextYield.max === 'string' ? nextYield.max : String(nextYield.max ?? ''));
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'maxDurationMonths')) {
      const months = Number(nextState.maxDurationMonths);
      if (Number.isFinite(months)) {
        view.setMaxDurationMonths(months);
      }
    }
  };

  const f = view.filters;
  const chips: ActiveFilterChip[] = [];
  if (view.taxonomyApplied && f.selectedLineOfBusiness.size < allPrimaryKeys.length) {
    chips.push({
      key: 'lob',
      label: `Line of business · ${f.selectedLineOfBusiness.size}`,
      onRemove: () => view.setSelectedLineOfBusiness(new Set(allPrimaryKeys)),
    });
  }
  if (view.taxonomyApplied && f.selectedSubTypes.size < allSubKeys.length) {
    chips.push({
      key: 'sub',
      label: `Sub-types · ${f.selectedSubTypes.size}`,
      onRemove: () => view.setSelectedSubTypes(new Set(allSubKeys)),
    });
  }
  if (f.maxDurationMonths < DURATION_MONTHS_MAX) {
    chips.push({
      key: 'duration',
      label: `Max ${f.maxDurationMonths}M`,
      onRemove: () => view.setMaxDurationMonths(DURATION_MONTHS_MAX),
    });
  }
  if (f.yieldMin.trim() || f.yieldMax.trim()) {
    chips.push({
      key: 'yield',
      label: `Yield ${f.yieldMin.trim() || '0'}–${f.yieldMax.trim() || '∞'}%`,
      onRemove: () => {
        view.setYieldMin('');
        view.setYieldMax('');
      },
    });
  }
  if (f.query.trim()) {
    chips.push({
      key: 'query',
      label: `“${f.query.trim()}”`,
      onRemove: () => view.setQuery(''),
    });
  }
  for (const layer of MAP_LAYERS) {
    const on = layersEnabled[layer.id] ?? layer.defaultEnabled;
    if (on !== layer.defaultEnabled) {
      chips.push({
        key: `layer-${layer.id}`,
        label: `${on ? 'Layer' : 'Layer off'} · ${layer.label}`,
        accent: true,
        onRemove: () => mapLayerControls.onToggleLayer(layer.id),
      });
    }
  }
  if (is3D) {
    chips.push({
      key: 'layer-3d',
      label: 'Layer · 3D buildings',
      accent: true,
      onRemove: () => mapLayerControls.onToggle3D(),
    });
  }

  const clearAll = () => {
    view.setSelectedLineOfBusiness(new Set(allPrimaryKeys));
    view.setSelectedSubTypes(new Set(allSubKeys));
    view.setSelectedPerils(new Set(allPerilKeys));
    view.setSelectedGeographies(new Set());
    view.setMaxDurationMonths(DURATION_MONTHS_MAX);
    view.setYieldMin('');
    view.setYieldMax('');
    view.setQuery('');
    view.setExtraFilters({});
    resetLayers();
  };

  const showMap = view.canvasView !== 'list';
  const showDeals = view.canvasView !== 'map';
  const submissionsOn = layersEnabled.submissions ?? true;
  const selectedTypes = useMemo(
    () => new Set(mapLayerControls.layerFacets.submissions ?? []),
    [mapLayerControls.layerFacets]
  );
  const resolvedTypeColors = resolveSubmissionTypeColors(ctx.submissionTypeColors);
  const customSlots = useMemo(() => {
    if (!submissionsOn) return {};
    return {
      submissionTypeTree: (
        <SubmissionTypeTree
          selected={selectedTypes}
          onToggleType={(code: string) => mapLayerControls.onToggleLayerFacet('submissions', code)}
          onSetDomainSelected={(codes: string[], on: boolean) =>
            ctx.setLayerFacetValues('submissions', codes, on)
          }
          typeColors={resolvedTypeColors}
          onSetColor={ctx.setSubmissionTypeColor}
          onResetColors={ctx.resetSubmissionTypeColors}
          palette={SUBMISSION_TYPE_PALETTE}
        />
      ),
    };
  }, [
    ctx,
    mapLayerControls,
    resolvedTypeColors,
    selectedTypes,
    submissionsOn,
  ]);

  return (
    <ExplorerCard>
      <MarketplaceExplorerToolbar
        dealCount={ctx.deals.length}
        query={view.query}
        onQueryChange={view.setQuery}
        sort={view.sort}
        onSortChange={view.setSort}
        canvasView={view.canvasView}
        onCanvasViewChange={view.setCanvasView}
        filtersOpen={view.filtersOpen}
        onToggleFilters={() => view.setFiltersOpen(!view.filtersOpen)}
        activeFilterCount={chips.length}
      />
      <MarketplaceActiveFilters chips={chips} onClearAll={clearAll} />
      <ExplorerBody>
        <ExplorerCanvas>
          {showMap ? (
            <MarketplaceMapSection
              mapPoints={ctx.mapPoints}
              onPointClick={ctx.setHighlightedDealId}
              layers={{ ...mapLayerControls, onLayerCounts: ctx.setLayerCounts }}
              layerColors={ctx.layerColors}
              fetchContext={ctx.mapFetchContext}
            />
          ) : null}
          {showDeals ? (
            <MarketplaceDealsSection
              viewMode={view.viewMode}
              onViewModeChange={view.setViewMode}
              isLoading={ctx.isLoadingOpportunities}
              error={ctx.opportunitiesError}
              opportunities={ctx.filteredOpportunities}
              totalOpportunityCount={ctx.opportunities.length}
              deals={ctx.deals}
              tableRows={ctx.tableRows}
              highlightedDealId={ctx.highlightedDealId}
            />
          ) : null}
        </ExplorerCanvas>
        {view.filtersOpen ? (
          <MarketplaceFilterDock
            filtersConfig={filtersConfig}
            filterValues={dockFilterValues}
            preloadedData={dockPreloadedData}
            customSlots={customSlots}
            onFilterValuesChange={onDockFilterValuesChange}
            mapLayerOptions={mapLayerOptions}
            selectedLayers={selectedLayers}
            onToggleLayer={toggleLayer}
            onClose={() => view.setFiltersOpen(false)}
            onReset={clearAll}
            onApply={() => view.setFiltersOpen(false)}
          />
        ) : null}
      </ExplorerBody>
    </ExplorerCard>
  );
}

function FooterWidget() {
  const { events, overallSummary, opportunities } = useMarketplaceCtx();
  return (
    <MarketplaceFooterSection
      events={events}
      totalOpenCapacity={overallSummary.totalOpenCapacity}
      activeTranches={opportunities.length}
    />
  );
}

export const marketplaceRegistry: SurfaceRegistry = {
  'marketplace-stats': (_item, settings, editContext) => <StatsWidget settings={settings} editContext={editContext} />,
  'marketplace-explorer': () => <ExplorerWidget />,
  'marketplace-footer': () => <FooterWidget />,
  'custom-metric': (item) => <CustomMetricWidget definition={item.settings?.definition as MetricDefinition | undefined} />,
};
