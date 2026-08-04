import React, { useMemo, useState, useEffect } from 'react';
import MultiSelect from '../../../../xds/components/MultiSelect';
import Input from '../../../../xds/components/Input';
import { searchPlaces } from '../../../../api/geolocation';
import {
  deriveRegionRef,
  parseRegionRef,
  regionLabel,
  type RegionSearchOption,
} from '../../../../xds/components/regionAppetite';
import { colors } from '../../../../xds/colors';
import type { LineOfBusinessPrimaryType } from '../../marketplaceTypes';
import { primaryTypeKey, subTypeKey } from '../../useMarketplaceFilters';
import FilterSection, { DisabledField } from '../FilterSection';
import { FilterFieldBlock, FilterFieldLabel, FilterTwoColGrid, ChipClearAll } from '../../Marketplace.styles';

type Props = {
  primaryTypes: LineOfBusinessPrimaryType[];
  isLoadingTaxonomy: boolean;
  taxonomyError: string | null;
  perilOptions: Array<{ value: string; label: string }>;
  isLoadingPerils: boolean;
  perilsError: string | null;
  selectedPerils: Set<string>;
  onSelectedPerilsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedGeographies: Set<string>;
  onSelectedGeographiesChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedLineOfBusiness: Set<string>;
  onSelectedLineOfBusinessChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedSubTypes: Set<string>;
  onSelectedSubTypesChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  typeSection?: React.ReactNode;
  active: number;
};

export default function ExposureSection({
  primaryTypes,
  isLoadingTaxonomy,
  taxonomyError,
  perilOptions,
  isLoadingPerils,
  perilsError,
  selectedPerils,
  onSelectedPerilsChange,
  selectedGeographies,
  onSelectedGeographiesChange,
  selectedLineOfBusiness,
  onSelectedLineOfBusinessChange,
  selectedSubTypes,
  onSelectedSubTypesChange,
  typeSection,
  active,
}: Props) {
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
      if (next.has(value)) next.delete(value);
      else next.add(value);
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
      for (const value of values) next.delete(value);
      return next;
    });
  };

  // Geography search/autocomplete state (freeform input that produces structured entries)
  const [geoQuery, setGeoQuery] = useState('');
  const [geoOptions, setGeoOptions] = useState<RegionSearchOption[]>([]);
  const [geoSearching, setGeoSearching] = useState(false);

  // Local min/max state for enabled numeric fields
  const [tivMin, setTivMin] = useState('');
  const [tivMax, setTivMax] = useState('');
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');
  const [limitMin, setLimitMin] = useState('');
  const [limitMax, setLimitMax] = useState('');
  const [attachmentMin, setAttachmentMin] = useState('');
  const [attachmentMax, setAttachmentMax] = useState('');

  React.useEffect(() => {
    if (!geoQuery || geoQuery.trim().length < 2) {
      setGeoOptions([]);
      return;
    }
    let cancelled = false;
    setGeoSearching(true);
    const t = window.setTimeout(() => {
      void searchPlaces(geoQuery, { limit: 6 })
        .then((res) => {
          if (cancelled) return;
          const out: RegionSearchOption[] = [];
          const seen = new Set<string>();
          for (const c of res.candidates) {
            const entry = deriveRegionRef(c);
            if (!entry) continue;
            const dedupe = entry.toLowerCase();
            if (seen.has(dedupe)) continue;
            seen.add(dedupe);
            const label = c.city || c.state || c.countryCode || entry;
            const sublabel = [c.city ? c.state : null, c.countryCode].filter(Boolean).join(', ');
            out.push({ label: String(label), sublabel: sublabel || undefined, entry });
          }
          setGeoOptions(out);
        })
        .catch(() => setGeoOptions([]))
        .finally(() => setGeoSearching(false));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setGeoSearching(false);
    };
  }, [geoQuery]);

  const addGeoEntry = (entry: string) => {
    onSelectedGeographiesChange((prev) => new Set([...prev, entry]));
    setGeoQuery('');
    setGeoOptions([]);
  };

  return (
    <FilterSection title="Exposure" icon="stacked_line_chart" color={colors.primary} fieldCount={10} active={active} defaultOpen>
      <FilterFieldBlock>
        <FilterFieldLabel>Line of business</FilterFieldLabel>
        <MultiSelect
          label="Line of business"
          placeholder="Any line of business"
          searchPlaceholder="Search line of business…"
          options={lineOfBusinessOptions}
          selected={selectedLineOfBusiness}
          onToggle={(value) => toggleSelection(onSelectedLineOfBusinessChange, value)}
          onSelectAll={(values) => addValues(onSelectedLineOfBusinessChange, values)}
          onClear={(values) => removeValues(onSelectedLineOfBusinessChange, values)}
          isLoading={isLoadingTaxonomy}
          error={taxonomyError}
          loadingText="Loading line of business values…"
          emptyText="No line of business metadata available."
          noMatchText="No line of business matches your search."
        />
      </FilterFieldBlock>
      <FilterFieldBlock>
        <FilterFieldLabel>Sub-types</FilterFieldLabel>
        <MultiSelect
          label="Sub-types"
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
      </FilterFieldBlock>
      <FilterFieldBlock>
        <FilterFieldLabel>Peril</FilterFieldLabel>
        <MultiSelect
          label="Peril"
          placeholder="Any peril"
          searchPlaceholder="Search perils…"
          options={perilOptions}
          selected={selectedPerils}
          onToggle={(value) => toggleSelection(onSelectedPerilsChange, value)}
          onSelectAll={(values) => addValues(onSelectedPerilsChange, values)}
          onClear={(values) => removeValues(onSelectedPerilsChange, values)}
          isLoading={isLoadingPerils}
          error={perilsError}
          loadingText="Loading perils…"
          emptyText="No perils available."
          noMatchText="No peril matches your search."
        />
      </FilterFieldBlock>

      <FilterFieldBlock>
        <FilterFieldLabel>Geography</FilterFieldLabel>
        <div style={{ position: 'relative' }}>
          <Input
            placeholder="Type a place or paste an entry (e.g. US/Florida/Tampa)"
            value={geoQuery}
            onChange={(e) => setGeoQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const parsed = parseRegionRef(geoQuery);
                if (parsed) addGeoEntry(parsed.entry);
                else if (geoQuery.trim()) addGeoEntry(geoQuery.trim());
                e.preventDefault();
              }
            }}
            aria-label="Geography"
          />
          {geoOptions.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 6, left: 0, right: 0, background: 'white', border: '1px solid #eee', maxHeight: 220, overflow: 'auto' }}>
              {geoOptions.map((opt) => (
                <div key={opt.entry} style={{ padding: 8, cursor: 'pointer' }} onClick={() => addGeoEntry(opt.entry)}>
                  <div style={{ fontSize: 14 }}>{opt.label}</div>
                  {opt.sublabel ? <div style={{ fontSize: 12, color: '#666' }}>{opt.sublabel}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedGeographies.size > 0 ? (
          <div style={{ marginTop: 8 }}>
            {Array.from(selectedGeographies).map((g) => (
              <ChipClearAll key={g} type="button" onClick={() => removeValues(onSelectedGeographiesChange, [g])}>
                {regionLabel(g)} ×
              </ChipClearAll>
            ))}
          </div>
        ) : null}
      </FilterFieldBlock>
      {/* Enabled min/max controls for TIV, Capacity, Limit, and Attachment */}
      <FilterFieldBlock>
        <FilterFieldLabel>TIV ($ range)</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input placeholder="Min" type="number" inputMode="decimal" value={tivMin} onChange={(e) => setTivMin(e.target.value)} aria-label="Minimum TIV" />
          <Input placeholder="Max" type="number" inputMode="decimal" value={tivMax} onChange={(e) => setTivMax(e.target.value)} aria-label="Maximum TIV" />
        </FilterTwoColGrid>
      </FilterFieldBlock>

      <FilterFieldBlock>
        <FilterFieldLabel>Capacity</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input placeholder="Min" type="number" inputMode="decimal" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)} aria-label="Minimum capacity" />
          <Input placeholder="Max" type="number" inputMode="decimal" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)} aria-label="Maximum capacity" />
        </FilterTwoColGrid>
      </FilterFieldBlock>

      <FilterFieldBlock>
        <FilterFieldLabel>Limit</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input placeholder="Min" type="number" inputMode="decimal" value={limitMin} onChange={(e) => setLimitMin(e.target.value)} aria-label="Minimum limit" />
          <Input placeholder="Max" type="number" inputMode="decimal" value={limitMax} onChange={(e) => setLimitMax(e.target.value)} aria-label="Maximum limit" />
        </FilterTwoColGrid>
      </FilterFieldBlock>

      <FilterFieldBlock>
        <FilterFieldLabel>Attachment</FilterFieldLabel>
        <FilterTwoColGrid>
          <Input placeholder="Min" type="number" inputMode="decimal" value={attachmentMin} onChange={(e) => setAttachmentMin(e.target.value)} aria-label="Minimum attachment" />
          <Input placeholder="Max" type="number" inputMode="decimal" value={attachmentMax} onChange={(e) => setAttachmentMax(e.target.value)} aria-label="Maximum attachment" />
        </FilterTwoColGrid>
      </FilterFieldBlock>
    </FilterSection>
  );
}
