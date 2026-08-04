import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { colors } from '../xds/colors';
import Input from '../xds/components/Input';
import Button from '../xds/components/Button';
import { getModelCatalog } from './api';
import {
  AGG_FNS,
  METRIC_FORMATS,
  ownFields,
  TIME_BUCKETS,
  type AggFn,
  type CatalogModel,
  type MetricDefinition,
  type MetricTerm,
  type MetricViz,
  type ModelFieldCatalog,
} from './metricTypes';

// Editor for a custom metric, driven by the org model-field catalog. The user
// composes named aggregation terms over real attributes, a formula over those
// terms, an optional group-by (→ live chart/table), and a viz/format. It is fully
// controlled: every change rebuilds the definition and calls onChange.

const Section = styled.div`
  margin-bottom: 18px;
`;
const Label = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${colors.onSurfaceVariant};
  margin-bottom: 8px;
`;
const Select = styled.select`
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainer};
  color: ${colors.onSurface};
  font-size: 13px;
  max-width: 100%;
`;
const TermRow = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr 80px 1fr 28px;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
`;
const NameTag = styled.span`
  font-weight: 700;
  color: ${colors.primary};
  font-size: 13px;
`;
const SmallButton = styled.button`
  border: 1px dashed ${colors.outlineVariant};
  border-radius: 8px;
  background: transparent;
  color: ${colors.onSurface};
  cursor: pointer;
  font-size: 12px;
  padding: 6px 10px;
`;
const Remove = styled.button`
  border: none;
  background: transparent;
  color: ${colors.danger};
  cursor: pointer;
  font-size: 16px;
`;
const Hint = styled.div`
  font-size: 11px;
  color: ${colors.onSurfaceVariant};
  margin-top: 4px;
`;

const NAMES = 'ABCDEFGHIJKL'.split('');
const numeric = (m?: CatalogModel) => ownFields(m).filter((f) => f.kind === 'number');

export type MetricBuilderProps = {
  organizationId: number;
  value?: MetricDefinition;
  onChange: (def: MetricDefinition) => void;
};

const EMPTY: MetricDefinition = { terms: [], formula: '', viz: 'kpi', format: 'number' };

export default function MetricBuilder({ organizationId, value, onChange }: MetricBuilderProps) {
  const [catalog, setCatalog] = useState<ModelFieldCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const def = value ?? EMPTY;

  useEffect(() => {
    let alive = true;
    getModelCatalog(organizationId)
      .then((c) => alive && setCatalog(c))
      .catch((e) => alive && setLoadError(e?.message || 'Failed to load attributes'));
    return () => {
      alive = false;
    };
  }, [organizationId]);

  const modelByKey = useMemo(
    () => new Map((catalog?.models ?? []).map((m) => [m.key, m])),
    [catalog],
  );
  const grouped = Boolean(def.groupBy);

  const emit = (patch: Partial<MetricDefinition>) => onChange({ ...def, ...patch });

  const setTerm = (i: number, patch: Partial<MetricTerm>) =>
    emit({ terms: def.terms.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });

  const addTerm = () => {
    const name = NAMES[def.terms.length] ?? `T${def.terms.length}`;
    const modelKey = grouped ? def.groupBy!.modelKey : catalog?.models[0]?.key ?? '';
    emit({ terms: [...def.terms, { name, modelKey, fn: 'count' }] });
  };
  const removeTerm = (i: number) => emit({ terms: def.terms.filter((_, idx) => idx !== i) });

  const setGroupMode = (mode: 'none' | 'time' | 'category') => {
    if (mode === 'none') {
      emit({ groupBy: null, viz: 'kpi' });
      return;
    }
    const modelKey = def.terms[0]?.modelKey ?? catalog?.models[0]?.key ?? '';
    const model = modelByKey.get(modelKey);
    const wantKind = mode === 'time' ? 'date' : 'text';
    const field = ownFields(model).find((f) => (mode === 'time' ? f.kind === 'date' : f.kind === 'text' || f.kind === 'boolean'));
    const groupBy =
      mode === 'time'
        ? { kind: 'time' as const, modelKey, fieldPath: field?.path ?? '', bucket: 'month' as const }
        : { kind: 'category' as const, modelKey, fieldPath: field?.path ?? '' };
    // Grouped metrics use one model: pin all terms to it.
    void wantKind;
    emit({
      groupBy,
      viz: def.viz === 'kpi' ? 'bar' : def.viz,
      terms: def.terms.map((t) => ({ ...t, modelKey })),
    });
  };

  if (loadError) return <Hint>{loadError}</Hint>;
  if (!catalog) return <Hint>Loading attributes…</Hint>;

  const gb = def.groupBy;
  const groupModel = gb ? modelByKey.get(gb.modelKey) : undefined;
  const groupFieldOptions = gb
    ? ownFields(groupModel).filter((f) => (gb.kind === 'time' ? f.kind === 'date' : f.kind === 'text' || f.kind === 'boolean'))
    : [];

  return (
    <div>
      <Section>
        <Label>Terms — aggregate backend attributes</Label>
        {def.terms.map((t, i) => {
          const model = modelByKey.get(t.modelKey);
          const fieldOpts = numeric(model);
          return (
            <TermRow key={i}>
              <NameTag>{t.name}</NameTag>
              <Select
                aria-label={`Term ${t.name} model`}
                value={t.modelKey}
                disabled={grouped}
                onChange={(e) => setTerm(i, { modelKey: e.target.value, fieldPath: undefined })}
              >
                {catalog.models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.model}
                  </option>
                ))}
              </Select>
              <Select aria-label={`Term ${t.name} function`} value={t.fn} onChange={(e) => setTerm(i, { fn: e.target.value as AggFn })}>
                {AGG_FNS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              {t.fn === 'count' ? (
                <span style={{ fontSize: 12, color: 'var(--xds-on-surface-variant)' }}>rows</span>
              ) : (
                <Select aria-label={`Term ${t.name} field`} value={t.fieldPath ?? ''} onChange={(e) => setTerm(i, { fieldPath: e.target.value })}>
                  <option value="">field…</option>
                  {fieldOpts.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              )}
              <Remove type="button" aria-label={`Remove term ${t.name}`} onClick={() => removeTerm(i)}>
                ×
              </Remove>
            </TermRow>
          );
        })}
        <SmallButton type="button" onClick={addTerm} disabled={def.terms.length >= NAMES.length}>
          + Add term
        </SmallButton>
      </Section>

      <Section>
        <Label>Formula (use term letters)</Label>
        <Input
          type="text"
          placeholder="e.g. A / B"
          value={def.formula}
          onChange={(e) => emit({ formula: e.target.value })}
        />
        <Hint>Available: {def.terms.map((t) => t.name).join(', ') || '—'} · operators + − × ÷ ( )</Hint>
      </Section>

      <Section>
        <Label>Group by</Label>
        <Select aria-label="Group by mode" value={gb?.kind ?? 'none'} onChange={(e) => setGroupMode(e.target.value as any)}>
          <option value="none">None (single value)</option>
          <option value="time">Time (date field)</option>
          <option value="category">Category (text field)</option>
        </Select>
        {gb && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <Select
              aria-label="Group by field"
              value={gb.fieldPath}
              onChange={(e) => emit({ groupBy: { ...gb, fieldPath: e.target.value } as any })}
            >
              <option value="">field…</option>
              {groupFieldOptions.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.label}
                </option>
              ))}
            </Select>
            {gb.kind === 'time' && (
              <Select
                aria-label="Time bucket"
                value={gb.bucket}
                onChange={(e) => emit({ groupBy: { ...gb, bucket: e.target.value as any } })}
              >
                {TIME_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            )}
            <Hint>Grouped metrics use one model ({gb.modelKey}); all terms are pinned to it.</Hint>
          </div>
        )}
      </Section>

      <Section>
        <Label>Display</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select aria-label="Visualization" value={def.viz} onChange={(e) => emit({ viz: e.target.value as MetricViz })}>
            {(grouped ? (['line', 'bar', 'table'] as const) : (['kpi'] as const)).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
          <Select aria-label="Number format" value={def.format ?? 'number'} onChange={(e) => emit({ format: e.target.value as any })}>
            {METRIC_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
      </Section>
    </div>
  );
}
