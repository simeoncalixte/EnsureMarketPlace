import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors } from '../../../xds/colors';
import { renderTemplateField } from '../InsurerDashboard.renderers';
import DynamicSelect from '../../../components/fields/DynamicSelect';
import { loadSchemaOptionSet, type SchemaOptionItem, type SuggestedFormField } from '../../../api/pipeline';
import type { LineOfBusinessPageTemplateField } from '../lineOfBusinessTaxonomy';

// ---------------------------------------------------------------------------
// The single dynamic form-field renderer. Every template-driven field — the
// create-coverage AI sections AND the insured-subject cards — renders through
// this component, so capabilities (managed option-set selects, the per-field
// remove ×) apply uniformly. It composes the pure type→input map
// (`renderTemplateField`) and the generic managed select (`DynamicSelect`); it
// owns ONLY the managed-vs-static branch, the remove control, and option
// hydration. Grid placement (subjects) and repeatable card lists stay in the
// callers that wrap this component.
// ---------------------------------------------------------------------------

const FieldCell = styled.div`
  position: relative;
`;

const RemoveFieldButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  border: none;
  background: transparent;
  color: ${colors.secondary};
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
`;

export type DynamicFieldProps = {
  field: SuggestedFormField;
  value: string;
  onChange: (next: string) => void;
  /**
   * Tenant context. When set AND the field is an option-set-backed select/radio,
   * the field renders via DynamicSelect (overlay-aware options + inline add/manage).
   */
  organizationId?: number | null;
  /** Section the field belongs to — required to wire removal. */
  sectionKey?: string;
  /** Remove handler — when present and the field is AI-origin, the × shows. */
  onRemoveField?: (sectionKey: string, field: SuggestedFormField) => void;
  /**
   * Inside a repeatable card list. Disables managed-select + removal (mirrors the
   * existing create-coverage rule), so card rows stay plain editable fields.
   */
  repeatable?: boolean;
  /** Pre-hydrated options (e.g. a section-level batch loader already fetched them). */
  options?: SchemaOptionItem[];
  disabled?: boolean;
};

/**
 * One dynamic field: a managed DynamicSelect for option-set selects (with tenant
 * context), else the static renderer; optionally wrapped with a remove × for
 * AI-generated fields.
 */
const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  organizationId,
  sectionKey,
  onRemoveField,
  repeatable,
  options,
  disabled,
}) => {
  const isChoice = field.type === 'select' || field.type === 'radio';
  const managed = organizationId != null && !repeatable && Boolean(field.optionSetKey) && isChoice;
  const removable = Boolean(onRemoveField) && Boolean(sectionKey) && !repeatable && field.origin === 'ai';

  // Self-load options for a non-managed choice field that references an option set
  // but wasn't pre-hydrated (e.g. the subjects path has no section-level batch loader).
  const needsLazy = !managed && isChoice && Boolean(field.optionSetKey) && !field.options && !options;
  const [lazyOptions, setLazyOptions] = useState<SchemaOptionItem[] | null>(null);
  useEffect(() => {
    if (!needsLazy) return;
    let cancelled = false;
    loadSchemaOptionSet(field.optionSetKey as string, organizationId ?? undefined).then((set) => {
      if (!cancelled) setLazyOptions(set?.items ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [needsLazy, field.optionSetKey, organizationId]);

  const handleRemove = useCallback(() => {
    if (sectionKey) onRemoveField?.(sectionKey, field);
  }, [onRemoveField, sectionKey, field]);

  let node: React.ReactNode;
  if (managed) {
    node = (
      <S.TemplateField key={field.key}>
        <S.FormFieldLabel>
          {field.label}
          {field.required ? ' *' : ''}
        </S.FormFieldLabel>
        <S.TemplateControlSpacer>
          <DynamicSelect
            organizationId={organizationId ?? null}
            source={{ kind: 'optionSet', key: field.optionSetKey as string, manageable: true }}
            value={value}
            onChange={(next) => onChange(next == null ? '' : String(next))}
            includeBlank={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
            disabled={disabled}
          />
        </S.TemplateControlSpacer>
        {field.helperText ? <S.HelperText>{field.helperText}</S.HelperText> : null}
      </S.TemplateField>
    );
  } else {
    const resolvedOptions = options ?? lazyOptions ?? undefined;
    const rendered = (resolvedOptions ? { ...field, options: resolvedOptions } : field) as unknown as LineOfBusinessPageTemplateField;
    node = renderTemplateField(rendered, value, onChange);
  }

  if (!removable) return <>{node}</>;
  return (
    <FieldCell key={field.key}>
      {node}
      <RemoveFieldButton
        type="button"
        title={`Remove "${field.label}" from this form for future submissions`}
        aria-label={`Remove ${field.label}`}
        onClick={handleRemove}
      >
        ×
      </RemoveFieldButton>
    </FieldCell>
  );
};

export default DynamicField;
