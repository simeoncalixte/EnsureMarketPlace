import React from 'react';
import styled from 'styled-components';
import { colors } from '../xds/colors';
import Input from '../xds/components/Input';
import ToggleSwitch from '../xds/components/ToggleSwitch';
import type { SettingsSchema, WidgetSettingField } from './types';

// Generic editor for a widget's settings, driven entirely by its declared schema.
// Adding a new setting type means extending the backend schema + this switch —
// no per-widget editor code. Every widget also gets a universal title override.

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 12px;
  color: ${colors.onSurfaceVariant};
`;

const Select = styled.select`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${colors.outlineVariant};
  background: ${colors.surfaceContainer};
  color: ${colors.onSurface};
  font-size: 13px;
`;

const GroupLabel = styled.div`
  margin: 22px 0 12px;
  padding-bottom: 7px;
  border-bottom: 1px solid ${colors.outlineVariant};
  color: ${colors.onSurface};
  font-size: 13px;
  font-weight: 700;
`;

export type WidgetSettingsFormProps = {
  /** The widget's display title (catalog), shown as the rename placeholder. */
  widgetTitle: string;
  schema: SettingsSchema | undefined;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  showTitle?: boolean;
};

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: WidgetSettingField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'boolean':
      return (
        <Row>
          <span>{field.label}</span>
          <ToggleSwitch
            checked={value === undefined ? field.default : Boolean(value)}
            onChange={(v) => onChange(v)}
          />
        </Row>
      );
    case 'number':
      return (
        <Field>
          {field.label}
          <Input
            type="number"
            value={value === undefined ? field.default : (value as number)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(n);
            }}
          />
        </Field>
      );
    case 'select':
      return (
        <Field>
          {field.label}
          <Select value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'text':
    default:
      return (
        <Field>
          {field.label}
          <Input
            type="text"
            value={String(value ?? field.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}

export default function WidgetSettingsForm({ widgetTitle, schema, values, onChange, showTitle = true }: WidgetSettingsFormProps) {
  return (
    <div>
      {showTitle ? <Field>
        Title
        <Input
          type="text"
          placeholder={widgetTitle}
          value={typeof values.title === 'string' ? values.title : ''}
          onChange={(e) => onChange('title', e.target.value === '' ? undefined : e.target.value)}
        />
      </Field> : null}
      {(schema ?? []).map((field) => {
        const cardMatch = /^card(\d)Title$/.exec(field.key);
        return (
          <React.Fragment key={field.key}>
            {cardMatch ? <GroupLabel>Card {cardMatch[1]}</GroupLabel> : null}
            <FieldControl
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
