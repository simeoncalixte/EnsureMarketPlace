import React from 'react';
import MultiSelect from '../../../xds/components/MultiSelect';
import Input from '../../../xds/components/Input';
import Range from '../../../xds/components/Range';
import { colors } from '../../../xds/colors';
import { getJson } from '../../../api/client';
import {
  ChipClearAll,
  FilterFieldBlock,
  FilterFieldLabel,
  FilterTwoColGrid,
  RangeLabels,
} from '../Marketplace.styles';
import { autocompletePlaces } from '../../../api/geolocation';
import type { PlaceCandidate } from '../../../api/geolocation';
import FilterSection, { DisabledField } from './FilterSection';

// ── Types ────────────────────────────────────────────────────────────────────

type OptionItem = { value: string; label: string };

export type FieldConfig = {
  id: string;
  type:
    | 'multiselect'
    | 'minmax'
    | 'autocomplete'
    | 'autocomplete_multi'
    | 'text'
    | 'range'
    | 'custom'
    | 'disabled_select'
    | 'disabled_minmax'
    | 'disabled_range'
    | 'disabled_date'
    | string;
  label?: string;
  optionsSource?: string;
  optionsUrl?: string;
  dependsOn?: string | string[];
  options?: OptionItem[];
  slotKey?: string;
  uiProps?: Record<string, unknown>;
  resolver?: Record<string, unknown>;
};

export type SectionConfig = {
  id: string;
  title?: string;
  icon?: string;
  color?: string;
  defaultOpen?: boolean;
  fields: FieldConfig[];
};

export type FiltersConfig = {
  version: string;
  targeting?: Record<string, unknown>;
  sections: SectionConfig[];
};

export type FilterRendererProps = {
  config: FiltersConfig;
  value?: Record<string, unknown>;
  preloadedData?: Record<string, OptionItem[]>;
  slots?: Record<string, React.ReactNode>;
  onChange?: (state: Record<string, unknown>) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Geography autocomplete sub-component ─────────────────────────────────────

type GeographyAutocompleteProps = {
  fieldId: string;
  placeholder: string;
  value: string;
  onInputChange: (raw: string) => void;
  onSelect: (label: string) => void;
};

function GeographyAutocomplete({ fieldId, placeholder, value, onInputChange, onSelect }: GeographyAutocompleteProps) {
  const [suggestions, setSuggestions] = React.useState<PlaceCandidate[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(value, 280);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    autocompletePlaces(debouncedQuery, { limit: 8 })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.candidates);
        setOpen(res.candidates.length > 0);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = (candidate: PlaceCandidate) => {
    const label = candidate.formattedAddress ?? [candidate.city, candidate.state, candidate.countryCode].filter(Boolean).join(', ');
    onSelect(label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Input
        id={fieldId}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%', boxSizing: 'border-box' }}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        aria-autocomplete="list"
        aria-controls={`${fieldId}-listbox`}
        aria-expanded={open}
      />
      {loading && (
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.5 }}>
          …
        </span>
      )}
      {open && (
        <ul
          id={`${fieldId}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 1000,
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,.12)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((c, i) => {
            const label = c.formattedAddress ?? [c.city, c.state, c.countryCode].filter(Boolean).join(', ') ?? 'Unknown';
            return (
              <li
                key={`${c.placeId ?? label}-${i}`}
                role="option"
                aria-selected={false}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
                onMouseDown={() => handleSelect(c)}
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type GeographyAutocompleteMultiProps = {
  fieldId: string;
  placeholder: string;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

function GeographyAutocompleteMulti({ fieldId, placeholder, selected, onChange }: GeographyAutocompleteMultiProps) {
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<PlaceCandidate[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 280);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    autocompletePlaces(debouncedQuery, { limit: 8 })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.candidates);
        setOpen(res.candidates.length > 0);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const addEntry = (entry: string) => {
    const normalized = entry.trim();
    if (!normalized) return;
    const next = new Set(selected);
    next.add(normalized);
    onChange(next);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const removeEntry = (entry: string) => {
    const next = new Set(selected);
    next.delete(entry);
    onChange(next);
  };

  const handleSelect = (candidate: PlaceCandidate) => {
    const label =
      candidate.formattedAddress ??
      [candidate.city, candidate.state, candidate.countryCode].filter(Boolean).join(', ');
    addEntry(label);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Input
        id={fieldId}
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%', boxSizing: 'border-box' }}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            addEntry(query);
            event.preventDefault();
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        aria-autocomplete="list"
        aria-controls={`${fieldId}-multi-listbox`}
        aria-expanded={open}
      />
      {loading ? (
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            opacity: 0.5,
          }}
        >
          ...
        </span>
      ) : null}
      {open ? (
        <ul
          id={`${fieldId}-multi-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 1000,
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,.12)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((candidate, index) => {
            const label =
              candidate.formattedAddress ??
              [candidate.city, candidate.state, candidate.countryCode].filter(Boolean).join(', ') ??
              'Unknown';
            return (
              <li
                key={`${candidate.placeId ?? label}-${index}`}
                role="option"
                aria-selected={false}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  borderBottom: '1px solid #f0f0f0',
                }}
                onMouseDown={() => handleSelect(candidate)}
              >
                {label}
              </li>
            );
          })}
        </ul>
      ) : null}
      {selected.size > 0 ? (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from(selected).map((entry) => (
            <ChipClearAll key={entry} type="button" onClick={() => removeEntry(entry)}>
              {entry} x
            </ChipClearAll>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toStringSet(raw: unknown): Set<string> {
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
}

function normalizeOptionsPayload(payload: unknown): OptionItem[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (typeof entry === 'string') {
          return { value: entry, label: entry };
        }
        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          const value =
            typeof obj.value === 'string'
              ? obj.value
              : typeof obj.code === 'string'
              ? obj.code
              : typeof obj.id === 'string'
              ? obj.id
              : typeof obj.id === 'number'
              ? String(obj.id)
              : null;
          const label =
            typeof obj.label === 'string'
              ? obj.label
              : typeof obj.name === 'string'
              ? obj.name
              : value;
          if (!value || !label) return null;
          return { value, label };
        }
        return null;
      })
      .filter((entry): entry is OptionItem => Boolean(entry));
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const nested = obj.items ?? obj.options ?? obj.data;
    if (nested !== undefined) {
      return normalizeOptionsPayload(nested);
    }
  }

  return [];
}

function valueToTemplateToken(raw: unknown): string {
  if (raw instanceof Set) {
    return Array.from(raw).join(',');
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).join(',');
  }
  if (raw === null || raw === undefined) {
    return '';
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if ('min' in obj || 'max' in obj) {
      const min = obj.min === undefined || obj.min === null ? '' : String(obj.min);
      const max = obj.max === undefined || obj.max === null ? '' : String(obj.max);
      return `${min},${max}`;
    }
    return '';
  }
  return String(raw);
}

function hasDependencyValue(raw: unknown): boolean {
  if (raw instanceof Set) return raw.size > 0;
  if (Array.isArray(raw)) return raw.length > 0;
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'object') return Object.keys(raw as Record<string, unknown>).length > 0;
  return true;
}

function extractTemplateDependencies(template?: string): string[] {
  if (!template) return [];
  const dependencies = new Set<string>();
  const regex = /{([a-zA-Z0-9_]+)}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    dependencies.add(match[1]);
  }
  return Array.from(dependencies);
}

function fieldDependencies(field: FieldConfig): string[] {
  const explicit =
    typeof field.dependsOn === 'string'
      ? [field.dependsOn]
      : Array.isArray(field.dependsOn)
      ? field.dependsOn
      : [];
  const fromTemplate = extractTemplateDependencies(field.optionsUrl);
  return Array.from(new Set([...explicit, ...fromTemplate]));
}

function resolveOptionsUrl(template: string, state: Record<string, unknown>): string {
  return template.replace(/{([a-zA-Z0-9_]+)}/g, (_, token: string) =>
    encodeURIComponent(valueToTemplateToken(state[token]))
  );
}

function useLiveOptions(config: FiltersConfig, state: Record<string, unknown>) {
  const [optionsByField, setOptionsByField] = React.useState<Record<string, OptionItem[]>>({});
  const [loadingByField, setLoadingByField] = React.useState<Record<string, boolean>>({});
  const [errorByField, setErrorByField] = React.useState<Record<string, string | null>>({});

  const liveFields = React.useMemo(
    () => config.sections.flatMap((section) => section.fields).filter((field) => typeof field.optionsUrl === 'string' && field.optionsUrl.length > 0),
    [config]
  );

  React.useEffect(() => {
    if (liveFields.length === 0) return;
    let cancelled = false;

    const fetchField = async (field: FieldConfig) => {
      const dependencies = fieldDependencies(field);
      const missingDependency = dependencies.some((dependency) => !hasDependencyValue(state[dependency]));

      if (missingDependency || !field.optionsUrl) {
        if (cancelled) return;
        setOptionsByField((prev) => ({ ...prev, [field.id]: [] }));
        setLoadingByField((prev) => ({ ...prev, [field.id]: false }));
        setErrorByField((prev) => ({ ...prev, [field.id]: null }));
        return;
      }

      const url = resolveOptionsUrl(field.optionsUrl, state);
      if (!url) {
        if (cancelled) return;
        setOptionsByField((prev) => ({ ...prev, [field.id]: [] }));
        setLoadingByField((prev) => ({ ...prev, [field.id]: false }));
        setErrorByField((prev) => ({ ...prev, [field.id]: null }));
        return;
      }

      if (!cancelled) {
        setLoadingByField((prev) => ({ ...prev, [field.id]: true }));
        setErrorByField((prev) => ({ ...prev, [field.id]: null }));
      }

      try {
        const payload = await getJson<unknown>(url);
        if (cancelled) return;
        setOptionsByField((prev) => ({ ...prev, [field.id]: normalizeOptionsPayload(payload) }));
      } catch {
        if (cancelled) return;
        setOptionsByField((prev) => ({ ...prev, [field.id]: [] }));
        setErrorByField((prev) => ({ ...prev, [field.id]: 'Failed to load options.' }));
      } finally {
        if (!cancelled) {
          setLoadingByField((prev) => ({ ...prev, [field.id]: false }));
        }
      }
    };

    void Promise.all(liveFields.map((field) => fetchField(field)));

    return () => {
      cancelled = true;
    };
  }, [liveFields, state]);

  return { optionsByField, loadingByField, errorByField };
}

function disabledKindFromType(type: FieldConfig['type']): 'select' | 'minmax' | 'range' | 'date' {
  if (type === 'disabled_minmax') return 'minmax';
  if (type === 'disabled_range') return 'range';
  if (type === 'disabled_date') return 'date';
  return 'select';
}

const SECTION_UI_DEFAULTS: Record<string, { icon: string; color: string }> = {
  exposure: { icon: 'stacked_line_chart', color: colors.primary },
  financial: { icon: 'payments', color: colors.dataViz.green },
  risk: { icon: 'shield', color: colors.dataViz.orange },
  market: { icon: 'account_balance', color: colors.dataViz.purple },
  time: { icon: 'calendar_month', color: colors.dataViz.blueSky },
};

// ── Main renderer ─────────────────────────────────────────────────────────────

export default function FilterRenderer({
  config,
  value = {},
  preloadedData = {},
  slots = {},
  onChange,
}: FilterRendererProps) {
  const state = value;
  const { optionsByField: liveOptionsByField, loadingByField, errorByField } = useLiveOptions(config, state);

  const setFieldValue = React.useCallback(
    (fieldId: string, nextValue: unknown) => {
      onChange?.({ ...state, [fieldId]: nextValue });
    },
    [onChange, state]
  );

  const optionsForField = React.useCallback(
    (field: FieldConfig): OptionItem[] => {
      const live = liveOptionsByField[field.id];
      if (live !== undefined) {
        return live;
      }
      return preloadedData[field.optionsSource ?? ''] ?? field.options ?? [];
    },
    [liveOptionsByField, preloadedData]
  );

  const dependencyReadyForField = React.useCallback(
    (field: FieldConfig): boolean => {
      const dependencies = fieldDependencies(field);
      if (dependencies.length === 0) return true;
      return dependencies.every((dependency) => hasDependencyValue(state[dependency]));
    },
    [state]
  );

  React.useEffect(() => {
    let nextState: Record<string, unknown> | null = null;

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (field.type !== 'multiselect') continue;

        const selected = toStringSet(state[field.id]);
        if (selected.size === 0) continue;

        const dependencyReady = dependencyReadyForField(field);
        const options = optionsForField(field);

        if (!dependencyReady) {
          if (!nextState) nextState = { ...state };
          nextState[field.id] = new Set<string>();
          continue;
        }

        const allowed = new Set(options.map((option) => option.value));
        const filtered = new Set(Array.from(selected).filter((value) => allowed.has(value)));
        if (filtered.size !== selected.size) {
          if (!nextState) nextState = { ...state };
          nextState[field.id] = filtered;
        }
      }
    }

    if (nextState) {
      onChange?.(nextState);
    }
  }, [config, dependencyReadyForField, onChange, optionsForField, state]);

  const isFieldActive = (field: FieldConfig): boolean => {
    if (
      field.type === 'disabled_select' ||
      field.type === 'disabled_minmax' ||
      field.type === 'disabled_range' ||
      field.type === 'disabled_date' ||
      field.type === 'custom'
    ) {
      return false;
    }

    if (field.type === 'multiselect') {
      const selected = toStringSet(state[field.id]);
      const options = optionsForField(field);
      if (options.length === 0) return selected.size > 0;
      return selected.size > 0 && selected.size < options.length;
    }

    if (field.type === 'minmax') {
      const current = (state[field.id] as { min?: unknown; max?: unknown } | undefined) ?? {};
      const min = typeof current.min === 'string' ? current.min.trim() : String(current.min ?? '').trim();
      const max = typeof current.max === 'string' ? current.max.trim() : String(current.max ?? '').trim();
      return Boolean(min || max);
    }

    if (field.type === 'autocomplete_multi') {
      return toStringSet(state[field.id]).size > 0;
    }

    if (field.type === 'autocomplete' || field.type === 'text') {
      return typeof state[field.id] === 'string' && (state[field.id] as string).trim().length > 0;
    }

    if (field.type === 'range') {
      const ui = field.uiProps ?? {};
      const fallback = Number(ui.defaultValue);
      const hasFallback = Number.isFinite(fallback);
      const currentRaw = state[field.id];
      const current = Number(currentRaw);
      if (!Number.isFinite(current)) return false;
      if (!hasFallback) return true;
      return current !== fallback;
    }

    return false;
  };

  const toggleMultiValue = (fieldId: string, optionValue: string) => {
    const next = toStringSet(state[fieldId]);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    setFieldValue(fieldId, next);
  };

  return (
    <div>
      {config.sections.map((section) => {
        const defaults = SECTION_UI_DEFAULTS[section.id] ?? {
          icon: 'filter_alt',
          color: colors.primary,
        };
        const activeCount = section.fields.reduce(
          (total, field) => total + (isFieldActive(field) ? 1 : 0),
          0
        );

        return (
          <FilterSection
            key={section.id}
            title={section.title ?? section.id}
            icon={section.icon ?? defaults.icon}
            color={section.color ?? defaults.color}
            fieldCount={section.fields.length}
            active={activeCount}
            defaultOpen={section.defaultOpen ?? section.id === 'exposure'}
          >
            {section.fields.map((field) => {
              const options = optionsForField(field);
              const ui = field.uiProps ?? {};

              if (field.type === 'multiselect') {
                const selected = toStringSet(state[field.id]);
                const dependencyReady = dependencyReadyForField(field);
                const dependencyBlocked = !dependencyReady;
                return (
                  <FilterFieldBlock key={field.id}>
                    <FilterFieldLabel>{field.label}</FilterFieldLabel>
                    <MultiSelect
                      label={field.label ?? ''}
                      placeholder={(ui.placeholder as string | undefined) ?? `Select ${field.label ?? field.id}`}
                      searchPlaceholder={(ui.searchPlaceholder as string | undefined) ?? `Search ${field.label ?? field.id}...`}
                      options={options}
                      selected={selected}
                      onToggle={(entry: string) => toggleMultiValue(field.id, entry)}
                      isLoading={loadingByField[field.id] === true}
                      error={errorByField[field.id] ?? null}
                      disabled={dependencyBlocked}
                      emptyText={(ui.emptyText as string | undefined) ?? `No ${field.label ?? field.id} available.`}
                      noMatchText={(ui.noMatchText as string | undefined) ?? `No ${field.label ?? field.id} matches your search.`}
                    />
                  </FilterFieldBlock>
                );
              }

              if (field.type === 'minmax') {
                const current = (state[field.id] as { min?: string; max?: string } | undefined) ?? {
                  min: '',
                  max: '',
                };
                return (
                  <FilterFieldBlock key={field.id}>
                    <FilterFieldLabel>{field.label}</FilterFieldLabel>
                    <FilterTwoColGrid>
                      <Input
                        type={(ui.inputType as string | undefined) ?? 'number'}
                        inputMode={(ui.inputMode as string | undefined) ?? 'decimal'}
                        value={current.min ?? ''}
                        placeholder={(ui.minPlaceholder as string | undefined) ?? 'Min'}
                        onChange={(event) =>
                          setFieldValue(field.id, {
                            ...current,
                            min: event.target.value,
                          })
                        }
                      />
                      <Input
                        type={(ui.inputType as string | undefined) ?? 'number'}
                        inputMode={(ui.inputMode as string | undefined) ?? 'decimal'}
                        value={current.max ?? ''}
                        placeholder={(ui.maxPlaceholder as string | undefined) ?? 'Max'}
                        onChange={(event) =>
                          setFieldValue(field.id, {
                            ...current,
                            max: event.target.value,
                          })
                        }
                      />
                    </FilterTwoColGrid>
                  </FilterFieldBlock>
                );
              }

              if (field.type === 'range') {
                const min = Number(ui.min ?? 0);
                const max = Number(ui.max ?? 100);
                const step = Number(ui.step ?? 1);
                const fallback = Number(ui.defaultValue);
                const hasFallback = Number.isFinite(fallback);
                const raw = Number(state[field.id]);
                const valueForRange = Number.isFinite(raw)
                  ? raw
                  : hasFallback
                  ? fallback
                  : max;
                const showAnyAtMax = ui.showAnyAtMax === true;
                const labels = Array.isArray(ui.labels)
                  ? (ui.labels as string[])
                  : [String(min), String(max)];

                return (
                  <FilterFieldBlock key={field.id}>
                    <FilterFieldLabel>
                      {showAnyAtMax && valueForRange >= max
                        ? `${field.label} · Any`
                        : `${field.label} · ${valueForRange}`}
                    </FilterFieldLabel>
                    <Range
                      min={min}
                      max={max}
                      step={step}
                      value={valueForRange}
                      onChange={(event) => setFieldValue(field.id, Number(event.target.value))}
                    />
                    {labels.length > 0 ? (
                      <RangeLabels>
                        {labels.map((entry, index) => (
                          <span key={`${field.id}-label-${index}`}>{entry}</span>
                        ))}
                      </RangeLabels>
                    ) : null}
                  </FilterFieldBlock>
                );
              }

              if (field.type === 'autocomplete') {
                const rawValue = typeof state[field.id] === 'string' ? (state[field.id] as string) : '';
                const placeholder = (ui.placeholder as string | undefined) ?? `Search ${field.label ?? field.id}...`;
                return (
                  <FilterFieldBlock key={field.id}>
                    <FilterFieldLabel>{field.label}</FilterFieldLabel>
                    <GeographyAutocomplete
                      fieldId={field.id}
                      placeholder={placeholder}
                      value={rawValue}
                      onInputChange={(rawInput) => setFieldValue(field.id, rawInput)}
                      onSelect={(label) => setFieldValue(field.id, label)}
                    />
                  </FilterFieldBlock>
                );
              }

              if (field.type === 'autocomplete_multi') {
                const selected = toStringSet(state[field.id]);
                const placeholder = (ui.placeholder as string | undefined) ?? `Search ${field.label ?? field.id}...`;
                return (
                  <FilterFieldBlock key={field.id}>
                    <FilterFieldLabel>{field.label}</FilterFieldLabel>
                    <GeographyAutocompleteMulti
                      fieldId={field.id}
                      placeholder={placeholder}
                      selected={selected}
                      onChange={(next) => setFieldValue(field.id, next)}
                    />
                  </FilterFieldBlock>
                );
              }

              if (field.type === 'custom') {
                const slot = field.slotKey ? slots[field.slotKey] : undefined;
                if (!slot) {
                  return (
                    <DisabledField
                      key={field.id}
                      label={field.label ?? field.id}
                      kind="select"
                    />
                  );
                }
                return (
                  <FilterFieldBlock key={field.id}>
                    {field.label ? <FilterFieldLabel>{field.label}</FilterFieldLabel> : null}
                    {slot}
                  </FilterFieldBlock>
                );
              }

              if (
                field.type === 'disabled_select' ||
                field.type === 'disabled_minmax' ||
                field.type === 'disabled_range' ||
                field.type === 'disabled_date'
              ) {
                return (
                  <DisabledField
                    key={field.id}
                    label={field.label ?? field.id}
                    kind={disabledKindFromType(field.type)}
                  />
                );
              }

              return (
                <FilterFieldBlock key={field.id}>
                  <FilterFieldLabel>{field.label}</FilterFieldLabel>
                  <Input
                    type="text"
                    value={typeof state[field.id] === 'string' ? (state[field.id] as string) : ''}
                    placeholder={(ui.placeholder as string | undefined) ?? ''}
                    onChange={(event) => setFieldValue(field.id, event.target.value)}
                  />
                </FilterFieldBlock>
              );
            })}
          </FilterSection>
        );
      })}
    </div>
  );
}
