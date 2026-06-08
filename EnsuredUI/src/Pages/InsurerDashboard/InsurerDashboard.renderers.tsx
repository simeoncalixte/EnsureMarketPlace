import React from 'react';
import styled from 'styled-components';
import Checkbox from '../../xds/components/Checkbox';
import Input from '../../xds/components/Input';
import NumberInput from '../../xds/components/NumberInput';
import Select from '../../xds/components/Select';
import Textarea from '../../xds/components/Textarea';
import { colors } from '../../xds/colors';
import * as S from './InsurerDashboard.styles';
import type { LineOfBusinessPageTemplateField } from './lineOfBusinessTaxonomy';

/** A number input flanked by a leading/trailing affix (e.g. "$" or "%"). */
const AffixedControl = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.text.secondary};
`;

export type TemplateFieldRenderer = (
  field: LineOfBusinessPageTemplateField,
  value: string,
  onChange: (nextValue: string) => void,
  label: React.ReactNode,
  helpText: React.ReactNode,
) => React.ReactNode;

export const templateFieldRenderers: Record<string, TemplateFieldRenderer> = {
  textarea: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <Textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  number: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <NumberInput
          value={value}
          step="any"
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  integer: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <NumberInput
          value={value}
          step={1}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  select: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <Select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>
          {(field.options ?? []).map((option) => (
            <option key={`${field.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  radio: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <S.RadioGroup role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => {
            const selected = option.value === value;

            return (
              <S.RadioOption key={`${field.key}-${option.value}`} $selected={selected} onClick={() => onChange(option.value)}>
                <S.RadioDot $selected={selected} />
                {option.label}
              </S.RadioOption>
            );
          })}
        </S.RadioGroup>
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  boolean: (field, value, onChange, label) => (
    <S.BooleanFieldLabel key={field.key}>
      <Checkbox checked={value === 'true'} onChange={(event) => onChange(event.target.checked ? 'true' : 'false')} />
      <S.BooleanFieldText>{label}</S.BooleanFieldText>
    </S.BooleanFieldLabel>
  ),
  currency: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <AffixedControl>
          <span aria-hidden>$</span>
          <NumberInput
            value={value}
            step="any"
            inputMode="decimal"
            placeholder={field.placeholder ?? '0.00'}
            onChange={(event) => onChange(event.target.value)}
          />
        </AffixedControl>
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  percentage: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <AffixedControl>
          <NumberInput
            value={value}
            step="any"
            inputMode="decimal"
            placeholder={field.placeholder ?? '0'}
            onChange={(event) => onChange(event.target.value)}
          />
          <span aria-hidden>%</span>
        </AffixedControl>
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
  date: (field, value, onChange, label, helpText) => (
    <S.TemplateField key={field.key}>
      {label}
      <S.TemplateControlSpacer>
        <Input
          type="date"
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </S.TemplateControlSpacer>
      {helpText}
    </S.TemplateField>
  ),
};

export const defaultTemplateFieldRenderer: TemplateFieldRenderer = (field, value, onChange, label, helpText) => (
  <S.TemplateField key={field.key}>
    {label}
    <S.TemplateControlSpacer>
      <Input
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </S.TemplateControlSpacer>
    {helpText}
  </S.TemplateField>
);

export function renderTemplateField(
  field: LineOfBusinessPageTemplateField,
  value: string,
  onChange: (nextValue: string) => void,
): React.ReactNode {
  const label = (
    <S.FormFieldLabel>
      {field.label}
      {field.required ? ' *' : ''}
    </S.FormFieldLabel>
  );

  const helpText = field.helperText ? <S.HelperText>{field.helperText}</S.HelperText> : null;

  const renderer = templateFieldRenderers[field.type] ?? defaultTemplateFieldRenderer;
  return renderer(field, value, onChange, label, helpText);
}
