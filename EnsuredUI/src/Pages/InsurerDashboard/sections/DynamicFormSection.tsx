import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import Button from '../../../xds/components/Button';
import { colors } from '../../../xds/colors';
import { renderTemplateField } from '../InsurerDashboard.renderers';
import type { LineOfBusinessPageTemplateField } from '../lineOfBusinessTaxonomy';
import type { SuggestedFormField } from '../../../api/pipeline';

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
`;

const ItemCard = styled.div`
  border: 1px solid ${colors.outlineVariant};
  border-radius: 8px;
  padding: 16px;
  display: grid;
  gap: 12px;
  background: ${colors.surface};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

const CardList = styled.div`
  display: grid;
  gap: 8px;
`;

const AiBadge = styled.span`
  margin-left: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: ${colors.secondary};
  border: 1px solid ${colors.secondary};
`;

export type DynamicFormSectionProps = {
  isActive: boolean;
  label: string;
  description?: string | null;
  fields: SuggestedFormField[];
  repeatable?: boolean;
  /** 'ai' surfaces an "AI" badge so users can tell scaffold from suggestion. */
  badge?: 'ai' | null;
  /** Renders without the big section title (used to inject extra fields into a base tab). */
  inline?: boolean;
};

/** Narrow the suggested-form field to the shape the shared renderer understands. */
function toRendererField(field: SuggestedFormField): LineOfBusinessPageTemplateField {
  return field as unknown as LineOfBusinessPageTemplateField;
}

/** Seed values from the prefilled `value`, then any template default. */
function initialValues(fields: SuggestedFormField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const seed = field.value ?? field.defaultValue;
    out[field.key] = seed == null ? '' : String(seed);
  }
  return out;
}

function singular(label: string): string {
  return label.replace(/ies$/i, 'y').replace(/s$/i, '') || label;
}

/**
 * Renders a dynamic, schema-driven set of fields — either inline within a base
 * create-coverage tab (AI-extension fields) or as a standalone AI section tab.
 * Repeatable sections render as an add/remove card list. Values are prefilled
 * from the submission; state is local (wiring into the deal payload is a follow-up).
 */
const DynamicFormSection = React.memo(function DynamicFormSection({
  isActive,
  label,
  description,
  fields,
  repeatable,
  badge,
  inline,
}: DynamicFormSectionProps) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields));
  const [items, setItems] = useState<Array<Record<string, string>>>(() => [initialValues(fields)]);

  useEffect(() => {
    setValues(initialValues(fields));
    setItems([initialValues(fields)]);
  }, [fields]);

  const setFieldValue = useCallback((key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const setItemFieldValue = useCallback((index: number, key: string, value: string) => {
    setItems((current) => {
      const list = current.slice();
      list[index] = { ...list[index], [key]: value };
      return list;
    });
  }, []);

  const addItem = useCallback(() => setItems((current) => [...current, initialValues(fields)]), [fields]);
  const removeItem = useCallback(
    (index: number) => setItems((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current)),
    [],
  );

  const heading = (
    <S.FormFieldLabel as={inline ? 'h4' : 'h3'}>
      {label}
      {badge === 'ai' ? <AiBadge>AI</AiBadge> : null}
    </S.FormFieldLabel>
  );

  const body = repeatable ? (
    <CardList>
      {items.map((itemValues, index) => (
        <ItemCard key={index}>
          <CardHeader>
            <CardTitle>{`${singular(label)} ${index + 1}`}</CardTitle>
            <Button type="button" variant="ghost" onClick={() => removeItem(index)}>Remove</Button>
          </CardHeader>
          <FieldGrid>
            {fields.map((field) =>
              renderTemplateField(toRendererField(field), itemValues[field.key] ?? '', (next) => setItemFieldValue(index, field.key, next)),
            )}
          </FieldGrid>
        </ItemCard>
      ))}
      <div>
        <Button type="button" onClick={addItem}>{`+ Add ${singular(label)}`}</Button>
      </div>
    </CardList>
  ) : (
    <FieldGrid>
      {fields.map((field) =>
        renderTemplateField(toRendererField(field), values[field.key] ?? '', (next) => setFieldValue(field.key, next)),
      )}
    </FieldGrid>
  );

  // Inline injection lives inside an already-active base tab, so it does not wrap
  // itself in a toggled <S.Section>.
  if (inline) {
    if (!isActive) return null;
    return (
      <div>
        {heading}
        {description ? <S.HelperText>{description}</S.HelperText> : null}
        {body}
      </div>
    );
  }

  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>{label}</S.SectionTitle>
        <S.SectionRule />
        {badge === 'ai' ? <AiBadge>AI section</AiBadge> : null}
      </S.SectionHeader>
      {description ? <S.PreloadedMeta>{description}</S.PreloadedMeta> : null}
      <S.SectionGrid>{body}</S.SectionGrid>
    </S.Section>
  );
});

export default DynamicFormSection;
