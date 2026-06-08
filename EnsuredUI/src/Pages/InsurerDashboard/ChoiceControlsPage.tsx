import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAuthMe } from '../../lib/useAuthMe';
import { Button, SegmentedSwitch, StatCard, ToggleSwitch } from '../../xds';
import Checkbox from '../../xds/components/Checkbox';
import { colors, withAlpha } from '../../xds/colors';
import {
  loadInsuredSubjectPageTemplate,
  saveLineOfBusinessPageTemplate,
  type LineOfBusinessPageTemplate,
  type LineOfBusinessPageTemplateField,
  type LineOfBusinessPageTemplateOption,
  type LineOfBusinessPageTemplateSection,
} from './lineOfBusinessTaxonomy';

type ChoiceControlKind = 'select' | 'checkbox' | 'radio';

type ChoiceFieldDraft = {
  label: string;
  key: string;
  kind: ChoiceControlKind;
  required: boolean;
  helperText: string;
  placeholder: string;
  defaultValue: string;
  defaultChecked: boolean;
  optionsText: string;
};

type ChoiceKindMeta = {
  kind: ChoiceControlKind;
  label: string;
  description: string;
  accent: string;
};

const CONTROL_SECTION_KEY = 'choice-controls-studio';
const CONTROL_SECTION_LABEL = 'Choice Controls';
const CONTROL_SECTION_DESCRIPTION = 'Persisted select menus, checkboxes, and radio buttons created from the control studio.';

const CONTROL_KIND_META: ChoiceKindMeta[] = [
  {
    kind: 'select',
    label: 'Select menu',
    description: 'Persist a single-choice dropdown with named options.',
    accent: colors.primary,
  },
  {
    kind: 'checkbox',
    label: 'Checkbox',
    description: 'Persist a boolean toggle that renders as a checkbox.',
    accent: colors.dataViz.teal,
  },
  {
    kind: 'radio',
    label: 'Radio buttons',
    description: 'Persist a single-choice group that renders as radio buttons.',
    accent: colors.warning,
  },
];

const starterChoiceFields: LineOfBusinessPageTemplateField[] = [
  {
    key: 'preferred_contact_method',
    label: 'Preferred Contact Method',
    type: 'radio',
    order: 10,
    required: true,
    helperText: 'Rendered as a radio group so the user can choose exactly one contact path.',
    defaultValue: 'email',
    options: [
      { label: 'Email', value: 'email' },
      { label: 'SMS', value: 'sms' },
      { label: 'Phone', value: 'phone' },
    ],
  },
  {
    key: 'marketing_opt_in',
    label: 'Marketing Opt-In',
    type: 'boolean',
    order: 20,
    helperText: 'Rendered as a checkbox and persisted as a boolean field.',
    defaultValue: false,
  },
  {
    key: 'coverage_tier',
    label: 'Coverage Tier',
    type: 'select',
    order: 30,
    required: true,
    placeholder: 'Select a tier',
    helperText: 'Rendered as a select menu with a persisted option list.',
    defaultValue: 'standard',
    options: [
      { label: 'Standard', value: 'standard' },
      { label: 'Enhanced', value: 'enhanced' },
      { label: 'Enterprise', value: 'enterprise' },
    ],
  },
];

function cloneTemplate(template: LineOfBusinessPageTemplate): LineOfBusinessPageTemplate {
  return JSON.parse(JSON.stringify(template)) as LineOfBusinessPageTemplate;
}

function cloneFields(fields: LineOfBusinessPageTemplateField[]): LineOfBusinessPageTemplateField[] {
  return fields.map((field) => ({
    ...field,
    options: field.options?.map((option) => ({ ...option })),
  }));
}

function normalizeFieldKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function slugifyOptionValue(value: string, fallback: string): string {
  const normalized = normalizeFieldKey(value);
  return normalized || fallback;
}

function createEmptyDraft(kind: ChoiceControlKind = 'select'): ChoiceFieldDraft {
  return {
    label: '',
    key: '',
    kind,
    required: false,
    helperText: '',
    placeholder: 'Choose an option',
    defaultValue: '',
    defaultChecked: false,
    optionsText: '',
  };
}

function choiceKindForFieldType(type: string): ChoiceControlKind {
  if (type === 'boolean') {
    return 'checkbox';
  }

  if (type === 'radio') {
    return 'radio';
  }

  return 'select';
}

function fieldTypeForChoiceKind(kind: ChoiceControlKind): string {
  return kind === 'checkbox' ? 'boolean' : kind;
}

function formatOptionsText(options?: LineOfBusinessPageTemplateOption[]): string {
  if (!options || options.length === 0) {
    return '';
  }

  return options
    .map((option, index) => {
      const fallbackValue = slugifyOptionValue(option.label, `option_${index + 1}`);
      return option.value && option.value !== fallbackValue ? `${option.label} | ${option.value}` : option.label;
    })
    .join('\n');
}

function parseOptionsText(text: string): LineOfBusinessPageTemplateOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const delimiterMatch = line.split(/\||:/, 2).map((part) => part.trim());
      const label = delimiterMatch[0] || `Option ${index + 1}`;
      const rawValue = delimiterMatch[1] || '';
      const value = rawValue ? normalizeFieldKey(rawValue) : slugifyOptionValue(label, `option_${index + 1}`);

      return {
        label,
        value,
      };
    });
}

function getNextFieldOrder(fields: LineOfBusinessPageTemplateField[]): number {
  if (fields.length === 0) {
    return 10;
  }

  return Math.max(...fields.map((field) => Number(field.order) || 0)) + 10;
}

function sortFields(fields: LineOfBusinessPageTemplateField[]): LineOfBusinessPageTemplateField[] {
  return [...fields].sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
}

function normalizeLoadedFields(fields: LineOfBusinessPageTemplateField[]): LineOfBusinessPageTemplateField[] {
  return sortFields(cloneFields(fields));
}

function replaceFieldAtIndex(
  fields: LineOfBusinessPageTemplateField[],
  index: number,
  nextField: LineOfBusinessPageTemplateField,
): LineOfBusinessPageTemplateField[] {
  return fields.map((field, currentIndex) => (currentIndex === index ? nextField : field));
}

function resolveUniqueKey(baseKey: string, fields: LineOfBusinessPageTemplateField[], ignoredKey?: string): string {
  const normalizedBaseKey = normalizeFieldKey(baseKey) || 'choice_field';
  const usedKeys = new Set(fields.map((field) => field.key).filter((key) => key !== ignoredKey));

  if (!usedKeys.has(normalizedBaseKey)) {
    return normalizedBaseKey;
  }

  let suffix = 2;
  let nextKey = `${normalizedBaseKey}_${suffix}`;
  while (usedKeys.has(nextKey)) {
    suffix += 1;
    nextKey = `${normalizedBaseKey}_${suffix}`;
  }

  return nextKey;
}

function draftFromField(field: LineOfBusinessPageTemplateField): ChoiceFieldDraft {
  return {
    label: field.label,
    key: field.key,
    kind: choiceKindForFieldType(field.type),
    required: Boolean(field.required),
    helperText: field.helperText ?? '',
    placeholder: field.placeholder ?? 'Choose an option',
    defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : '',
    defaultChecked: typeof field.defaultValue === 'boolean' ? field.defaultValue : Boolean(field.defaultValue),
    optionsText: formatOptionsText(field.options),
  };
}

function buildFieldFromDraft(
  draft: ChoiceFieldDraft,
  fields: LineOfBusinessPageTemplateField[],
  ignoredKey?: string,
  existingOrder?: number,
): LineOfBusinessPageTemplateField {
  const options = draft.kind === 'checkbox' ? undefined : parseOptionsText(draft.optionsText);
  const baseKey = draft.key.trim() || draft.label;
  const key = resolveUniqueKey(baseKey, fields, ignoredKey);
  const fallbackValue = options?.[0]?.value ?? '';
  const defaultValue = draft.kind === 'checkbox'
    ? draft.defaultChecked
    : (draft.defaultValue.trim() || fallbackValue || undefined);

  return {
    key,
    label: draft.label.trim(),
    type: fieldTypeForChoiceKind(draft.kind),
    order: existingOrder ?? getNextFieldOrder(fields),
    required: draft.required,
    helperText: draft.helperText.trim() || undefined,
    placeholder: draft.kind === 'select' ? draft.placeholder.trim() || undefined : undefined,
    defaultValue,
    options,
  };
}

function validateDraft(draft: ChoiceFieldDraft): string | null {
  if (!draft.label.trim()) {
    return 'Field label is required.';
  }

  if (draft.kind !== 'checkbox' && parseOptionsText(draft.optionsText).length < 2) {
    return 'Select menus and radio groups need at least two options.';
  }

  return null;
}

function buildChoiceSection(params: {
  sectionLabel: string;
  sectionDescription: string;
  fields: LineOfBusinessPageTemplateField[];
  existingSection?: LineOfBusinessPageTemplateSection | null;
}): LineOfBusinessPageTemplateSection {
  return {
    key: CONTROL_SECTION_KEY,
    label: params.sectionLabel.trim() || CONTROL_SECTION_LABEL,
    order: params.existingSection?.order ?? 980,
    description: params.sectionDescription.trim() || undefined,
    fields: params.fields.map((field, index) => ({
      ...field,
      order: (index + 1) * 10,
    })),
  };
}

function upsertSection(template: LineOfBusinessPageTemplate, section: LineOfBusinessPageTemplateSection): LineOfBusinessPageTemplate {
  const nextTemplate = cloneTemplate(template);
  const sectionIndex = nextTemplate.sections.findIndex((current) => current.key === section.key);

  if (sectionIndex >= 0) {
    nextTemplate.sections = nextTemplate.sections.map((currentSection, index) => (index === sectionIndex ? section : currentSection));
    return nextTemplate;
  }

  nextTemplate.sections = [...nextTemplate.sections, section];
  return nextTemplate;
}

function fieldTypeLabel(type: string): string {
  if (type === 'boolean') {
    return 'Checkbox';
  }

  if (type === 'radio') {
    return 'Radio';
  }

  if (type === 'select') {
    return 'Select';
  }

  return type;
}

function summarizeField(field: LineOfBusinessPageTemplateField): string {
  const summaryBits: string[] = [];

  if (field.required) {
    summaryBits.push('required');
  }

  if (field.options && field.options.length > 0) {
    summaryBits.push(`${field.options.length} options`);
  }

  if (typeof field.defaultValue === 'boolean') {
    summaryBits.push(field.defaultValue ? 'default on' : 'default off');
  } else if (typeof field.defaultValue === 'string' && field.defaultValue.trim()) {
    summaryBits.push(`default ${field.defaultValue}`);
  }

  return summaryBits.length > 0 ? summaryBits.join(' • ') : 'No extra settings';
}

function renderPreviewControl(field: LineOfBusinessPageTemplateField): React.ReactNode {
  const previewValue = typeof field.defaultValue === 'string'
    ? field.defaultValue
    : (typeof field.defaultValue === 'boolean' ? field.defaultValue : field.options?.[0]?.value ?? '');
  const label = (
    <PreviewFieldLabel>
      <span>{field.label}</span>
      {field.required ? <PreviewRequiredMark>*</PreviewRequiredMark> : null}
    </PreviewFieldLabel>
  );
  const helpText = field.helperText ? <PreviewHelpText>{field.helperText}</PreviewHelpText> : null;

  if (field.type === 'boolean') {
    return (
      <PreviewField key={field.key}>
        {label}
        <PreviewCheckboxRow>
          <Checkbox
            defaultChecked={Boolean(previewValue)}
            disabled
            label={Boolean(previewValue) ? 'Enabled by default' : 'Disabled by default'}
          />
        </PreviewCheckboxRow>
        {helpText}
      </PreviewField>
    );
  }

  if (field.type === 'radio') {
    return (
      <PreviewField key={field.key}>
        {label}
        <PreviewRadioGroup role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => (
            <PreviewRadioOption key={`${field.key}-${option.value}`}>
              <PreviewRadioInput type="radio" name={field.key} value={option.value} defaultChecked={option.value === previewValue} disabled />
              <span>{option.label}</span>
            </PreviewRadioOption>
          ))}
        </PreviewRadioGroup>
        {helpText}
      </PreviewField>
    );
  }

  return (
    <PreviewField key={field.key}>
      {label}
      <PreviewSelect value={String(previewValue ?? '')} disabled>
        <option value="">{field.placeholder ?? 'Choose an option'}</option>
        {(field.options ?? []).map((option) => (
          <option key={`${field.key}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </PreviewSelect>
      {helpText}
    </PreviewField>
  );
}

export default function ChoiceControlsPage(): React.JSX.Element {
  const { user, loading: authLoading } = useAuthMe();
  const organizationId = user?.organizationId ?? null;

  const [template, setTemplate] = useState<LineOfBusinessPageTemplate | null>(null);
  const [existingSection, setExistingSection] = useState<LineOfBusinessPageTemplateSection | null>(null);
  const [sectionLabel, setSectionLabel] = useState(CONTROL_SECTION_LABEL);
  const [sectionDescription, setSectionDescription] = useState(CONTROL_SECTION_DESCRIPTION);
  const [choiceFields, setChoiceFields] = useState<LineOfBusinessPageTemplateField[]>(() => cloneFields(starterChoiceFields));
  const [draft, setDraft] = useState<ChoiceFieldDraft>(() => createEmptyDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persistedLabel, setPersistedLabel] = useState('Staged locally');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingTemplate(true);
      setPageError(null);

      try {
        const result = await loadInsuredSubjectPageTemplate({ organizationId });
        if (cancelled) {
          return;
        }

        const choiceSection = result.template.sections.find((section) => section.key === CONTROL_SECTION_KEY) ?? null;
        const nextFields = choiceSection?.fields ? normalizeLoadedFields(choiceSection.fields) : cloneFields(starterChoiceFields);

        setTemplate(result.template);
        setExistingSection(choiceSection);
        setSectionLabel(choiceSection?.label ?? CONTROL_SECTION_LABEL);
        setSectionDescription(choiceSection?.description ?? CONTROL_SECTION_DESCRIPTION);
        setChoiceFields(nextFields);
        setDraft(createEmptyDraft());
        setEditingIndex(null);
        setDraftError(null);
        setPersistedLabel(choiceSection ? 'Persisted section loaded' : 'Starter section staged');
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : 'Failed to load the template.');
          setPersistedLabel('Unable to load template');
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplate(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, organizationId]);

  const choiceSection = useMemo(
    () => buildChoiceSection({
      sectionLabel,
      sectionDescription,
      fields: choiceFields,
      existingSection,
    }),
    [choiceFields, existingSection, sectionDescription, sectionLabel],
  );

  const sectionPayloadJson = useMemo(() => JSON.stringify(choiceSection, null, 2), [choiceSection]);
  const templateTitle = template?.title ?? 'Insured Subjects';
  const scopeLabel = organizationId == null ? 'Global template' : `Organization ${organizationId}`;
  const selectionStats = useMemo(() => ({
    select: choiceFields.filter((field) => field.type === 'select').length,
    checkbox: choiceFields.filter((field) => field.type === 'boolean').length,
    radio: choiceFields.filter((field) => field.type === 'radio').length,
  }), [choiceFields]);
  const activeKindMeta = CONTROL_KIND_META.find((meta) => meta.kind === draft.kind) ?? CONTROL_KIND_META[0];

  function resetDraft(kind: ChoiceControlKind = 'select') {
    setDraft(createEmptyDraft(kind));
    setEditingIndex(null);
    setDraftError(null);
  }

  function handleKindChange(kind: ChoiceControlKind) {
    setDraft((current) => ({
      ...current,
      kind,
      placeholder: kind === 'checkbox' ? '' : current.placeholder || 'Choose an option',
      defaultChecked: kind === 'checkbox' ? current.defaultChecked : current.defaultChecked,
    }));
  }

  function handleLabelChange(label: string) {
    setDraft((current) => {
      const shouldFollowLabel = !current.key.trim() || current.key.trim() === normalizeFieldKey(current.label);
      return {
        ...current,
        label,
        key: shouldFollowLabel ? normalizeFieldKey(label) : current.key,
      };
    });
  }

  function handleEditField(index: number) {
    const field = choiceFields[index];
    if (!field) {
      return;
    }

    setDraft(draftFromField(field));
    setEditingIndex(index);
    setDraftError(null);
  }

  function handleRemoveField(index: number) {
    const field = choiceFields[index];
    if (!field) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`Remove ${field.label}?`)) {
      return;
    }

    setChoiceFields((current) => current.filter((_, currentIndex) => currentIndex !== index));

    if (editingIndex === index) {
      resetDraft();
    } else if (editingIndex != null && index < editingIndex) {
      setEditingIndex((current) => (current == null ? null : current - 1));
    }
  }

  function handleSubmitDraft() {
    const validationError = validateDraft(draft);
    if (validationError) {
      setDraftError(validationError);
      return;
    }

    const ignoredKey = editingIndex != null ? choiceFields[editingIndex]?.key : undefined;
    const existingOrder = editingIndex != null ? choiceFields[editingIndex]?.order : undefined;
    const nextField = buildFieldFromDraft(draft, choiceFields, ignoredKey, existingOrder);

    setChoiceFields((current) => {
      if (editingIndex == null) {
        return [...current, nextField];
      }

      return replaceFieldAtIndex(current, editingIndex, nextField);
    });

    setPersistedLabel(editingIndex == null ? 'Field staged locally' : 'Field updated locally');
    resetDraft(draft.kind);
  }

  function handleResetSection() {
    setSectionLabel(CONTROL_SECTION_LABEL);
    setSectionDescription(CONTROL_SECTION_DESCRIPTION);
    setChoiceFields(cloneFields(starterChoiceFields));
    setPersistedLabel('Starter section restored locally');
    resetDraft();
  }

  async function handleSaveTemplate() {
    if (!template || loadingTemplate || saving) {
      return;
    }

    setSaving(true);
    setPageError(null);

    try {
      const nextTemplate = upsertSection(template, choiceSection);
      const saved = await saveLineOfBusinessPageTemplate({
        definition: nextTemplate,
        organizationId,
      });
      const savedSection = saved.sections.find((section) => section.key === CONTROL_SECTION_KEY) ?? null;

      setTemplate(saved);
      setExistingSection(savedSection);
      setSectionLabel(savedSection?.label ?? sectionLabel);
      setSectionDescription(savedSection?.description ?? sectionDescription);
      setChoiceFields(normalizeLoadedFields(savedSection?.fields ?? choiceFields));
      setPersistedLabel('Saved to backend');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      resetDraft();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save the template.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <PageRoot>
        <LoadingPanel>
          <LoadingEyebrow>Choice controls</LoadingEyebrow>
          <LoadingTitle>Loading your account context</LoadingTitle>
          <LoadingText>Preparing the persisted control studio.</LoadingText>
        </LoadingPanel>
      </PageRoot>
    );
  }

  return (
    <PageRoot>
      <BackdropBlob $top={-140} $left={-120} $color={withAlpha(colors.primary, 0.18)} />
      <BackdropBlob $top={120} $left="72%" $color={withAlpha(colors.dataViz.teal, 0.14)} />
      <BackdropBlob $top="55%" $left="46%" $color={withAlpha(colors.warning, 0.12)} />

      <HeroCard>
        <HeroCopy>
          <Eyebrow>Persisted controls</Eyebrow>
          <HeroTitle>Choice Controls Studio</HeroTitle>
          <HeroDescription>
            Stage select menus, checkboxes, and radio groups, then persist the whole choice-controls section into the backend template JSON.
            The rest of the insured-subjects template is preserved.
          </HeroDescription>
          <HeroMeta>
            <MetaChip>{scopeLabel}</MetaChip>
            <MetaChip>{templateTitle}</MetaChip>
            <MetaChip>{choiceFields.length} controls</MetaChip>
            <MetaChip>{persistedLabel}</MetaChip>
            {lastSavedAt ? <MetaChip>Saved {lastSavedAt}</MetaChip> : null}
          </HeroMeta>
          <HeroNote>
            {existingSection ? 'Editing the persisted choice-controls section that already exists in the backend.' : 'The starter section is staged locally. Save it once to persist the new backend section.'}
          </HeroNote>
        </HeroCopy>
        <HeroActions>
          <Button type="button" variant="primary" onClick={() => void handleSaveTemplate()} disabled={!template || loadingTemplate || saving}>
            {saving ? 'Saving...' : 'Save to backend'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleSaveTemplate()} disabled={!template || loadingTemplate || saving}>
            Commit staged controls
          </Button>
          <Button type="button" variant="ghost" onClick={handleResetSection}>
            Reset section
          </Button>
        </HeroActions>
      </HeroCard>

      {pageError ? <AlertCard>{pageError}</AlertCard> : null}

      <StatsGrid>
        <StatTile
          label="Section"
          value={sectionLabel}
          note={sectionDescription || CONTROL_SECTION_DESCRIPTION}
          tone="muted"
        />
        <StatTile
          label="Controls"
          value={String(choiceFields.length)}
          note={`${selectionStats.select} select, ${selectionStats.checkbox} checkbox, ${selectionStats.radio} radio`}
          tone="muted"
        />
        <StatTile
          label="Scope"
          value={scopeLabel}
          note={existingSection ? 'Persisted section detected' : 'Working from the local starter set'}
          tone="muted"
        />
        <StatTile
          label="Template title"
          value={templateTitle}
          note={template?.description ? template.description : 'The template title stays intact while the choice-controls section is updated.'}
          tone="muted"
        />
      </StatsGrid>

      <WorkspaceGrid>
        <Column>
          <Panel>
            <PanelHeader>
              <div>
                <PanelEyebrow>Section settings</PanelEyebrow>
                <PanelTitle>Persisted section metadata</PanelTitle>
              </div>
              <PanelBadge>{choiceFields.length} fields</PanelBadge>
            </PanelHeader>

            <FieldGrid>
              <FieldBlock>
                <FieldLabel htmlFor="section-label">Section label</FieldLabel>
                <FieldInput
                  id="section-label"
                  value={sectionLabel}
                  onChange={(event) => setSectionLabel(event.target.value)}
                  placeholder="Choice Controls"
                />
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="section-description">Section description</FieldLabel>
                <FieldTextArea
                  id="section-description"
                  value={sectionDescription}
                  onChange={(event) => setSectionDescription(event.target.value)}
                  placeholder="Persisted select menus, checkboxes, and radio buttons..."
                />
              </FieldBlock>
            </FieldGrid>
          </Panel>

          <Panel>
            <PanelHeader>
              <div>
                <PanelEyebrow>Control builder</PanelEyebrow>
                <PanelTitle>{editingIndex == null ? 'Add a new control' : `Editing control #${editingIndex + 1}`}</PanelTitle>
              </div>
              <PanelBadge>{draft.kind === 'checkbox' ? 'checkbox' : draft.kind}</PanelBadge>
            </PanelHeader>

            <SegmentedSwitch
              aria-label="Control kind"
              options={CONTROL_KIND_META.map((meta) => ({ label: meta.label, value: meta.kind }))}
              value={draft.kind}
              onChange={(value: string) => handleKindChange(value as ChoiceControlKind)}
            />
            <KindDescription>{activeKindMeta.description}</KindDescription>

            <FieldGrid>
              <FieldBlock>
                <FieldLabel htmlFor="field-label">Field label</FieldLabel>
                <FieldInput
                  id="field-label"
                  value={draft.label}
                  onChange={(event) => handleLabelChange(event.target.value)}
                  placeholder="Preferred Contact Method"
                />
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="field-key">Field key</FieldLabel>
                <FieldInput
                  id="field-key"
                  value={draft.key}
                  onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
                  placeholder="preferred_contact_method"
                />
              </FieldBlock>
            </FieldGrid>

            <FieldGrid>
              <FieldBlock>
                <FieldLabel htmlFor="field-default">Default value</FieldLabel>
                {draft.kind === 'checkbox' ? (
                  <ToggleSwitch
                    id="field-default"
                    checked={draft.defaultChecked}
                    onChange={(value) => setDraft((current) => ({ ...current, defaultChecked: value }))}
                    label="Enabled by default"
                  />
                ) : (
                  <FieldInput
                    id="field-default"
                    value={draft.defaultValue}
                    onChange={(event) => setDraft((current) => ({ ...current, defaultValue: event.target.value }))}
                    placeholder="email"
                  />
                )}
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="field-placeholder">Placeholder</FieldLabel>
                <FieldInput
                  id="field-placeholder"
                  value={draft.placeholder}
                  onChange={(event) => setDraft((current) => ({ ...current, placeholder: event.target.value }))}
                  placeholder="Choose an option"
                  disabled={draft.kind === 'checkbox'}
                />
              </FieldBlock>
            </FieldGrid>

            <FieldGrid>
              <FieldBlock>
                <FieldLabel htmlFor="field-helper">Helper text</FieldLabel>
                <FieldTextArea
                  id="field-helper"
                  value={draft.helperText}
                  onChange={(event) => setDraft((current) => ({ ...current, helperText: event.target.value }))}
                  placeholder="Optional helper text shown beneath the control."
                />
              </FieldBlock>
              <FieldBlock>
                <FieldLabel htmlFor="field-options">Options</FieldLabel>
                <FieldTextArea
                  id="field-options"
                  value={draft.optionsText}
                  onChange={(event) => setDraft((current) => ({ ...current, optionsText: event.target.value }))}
                  placeholder={draft.kind === 'checkbox' ? 'Not used for checkboxes' : 'Email | email\nSMS | sms\nPhone | phone'}
                  disabled={draft.kind === 'checkbox'}
                />
                <FieldHint>
                  One option per line. Use <code>Label | value</code> when the persisted value should differ from the label.
                </FieldHint>
              </FieldBlock>
            </FieldGrid>

            {draftError ? <InlineError>{draftError}</InlineError> : null}

            <ButtonRow>
              <Button type="button" variant="primary" onClick={handleSubmitDraft}>
                {editingIndex == null ? 'Add control' : 'Update control'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => resetDraft(draft.kind)}>
                Clear form
              </Button>
              {editingIndex != null ? (
                <Button type="button" variant="ghost" onClick={() => resetDraft()}>
                  Cancel edit
                </Button>
              ) : null}
            </ButtonRow>
          </Panel>

          <Panel>
            <PanelHeader>
              <div>
                <PanelEyebrow>Current controls</PanelEyebrow>
                <PanelTitle>Fields staged for persistence</PanelTitle>
              </div>
              <PanelBadge>{choiceFields.length}</PanelBadge>
            </PanelHeader>

            <FieldList>
              {choiceFields.map((field, index) => (
                <FieldCard key={`${field.key}-${index}`}>
                  <FieldCardHeader>
                    <div>
                      <FieldCardTitle>{field.label}</FieldCardTitle>
                      <FieldCardKey>{field.key}</FieldCardKey>
                    </div>
                    <FieldTypeBadge $accent={kindMetaForField(field.type).accent}>
                      {fieldTypeLabel(field.type)}
                    </FieldTypeBadge>
                  </FieldCardHeader>
                  <FieldCardSummary>{summarizeField(field)}</FieldCardSummary>
                  {field.options && field.options.length > 0 ? (
                    <FieldOptionsSummary>
                      {field.options.map((option) => `${option.label} (${option.value})`).join(' • ')}
                    </FieldOptionsSummary>
                  ) : null}
                  <FieldCardActions>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleEditField(index)}>Edit</Button>
                    <Button type="button" variant="outline" size="sm" tone="danger" onClick={() => handleRemoveField(index)}>Remove</Button>
                  </FieldCardActions>
                </FieldCard>
              ))}
            </FieldList>
          </Panel>
        </Column>

        <Column>
          <Panel>
            <PanelHeader>
              <div>
                <PanelEyebrow>Live preview</PanelEyebrow>
                <PanelTitle>What the persisted controls will look like</PanelTitle>
              </div>
              <PanelBadge>Preview</PanelBadge>
            </PanelHeader>

            <PreviewSurface>
              {choiceFields.map((field) => renderPreviewControl(field))}
              {choiceFields.length === 0 ? <EmptyState>No controls staged yet. Add a select, checkbox, or radio control to begin.</EmptyState> : null}
            </PreviewSurface>
          </Panel>

          <Panel>
            <PanelHeader>
              <div>
                <PanelEyebrow>Persisted payload</PanelEyebrow>
                <PanelTitle>JSON that will be written to the backend</PanelTitle>
              </div>
              <PanelBadge>Section only</PanelBadge>
            </PanelHeader>

            <JsonPreview readOnly value={sectionPayloadJson} />
          </Panel>
        </Column>
      </WorkspaceGrid>
    </PageRoot>
  );
}

function kindMetaForField(type: string): ChoiceKindMeta {
  return CONTROL_KIND_META.find((meta) => meta.kind === choiceKindForFieldType(type)) ?? CONTROL_KIND_META[0];
}

const PageRoot = styled.section`
  position: relative;
  display: grid;
  gap: 1rem;
  max-width: 86rem;
  margin: 0 auto;
`;

const BackdropBlob = styled.div<{ $top: number | string; $left: number | string; $color: string }>`
  position: absolute;
  top: ${({ $top }) => (typeof $top === 'number' ? `${$top}px` : $top)};
  left: ${({ $left }) => (typeof $left === 'number' ? `${$left}px` : $left)};
  width: 20rem;
  height: 20rem;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
`;

const LoadingPanel = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  padding: 2rem;
  max-width: 32rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1.5rem;
  background: ${withAlpha(colors.surfaceDeep, 0.72)};
  backdrop-filter: blur(16px);
`;

const LoadingEyebrow = styled.div`
  color: ${colors.primary};
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const LoadingTitle = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1;
`;

const LoadingText = styled.p`
  margin: 0;
  color: ${colors.onSurfaceVariant};
  line-height: 1.6;
`;

const HeroCard = styled.section`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1.75rem;
  background:
    linear-gradient(135deg, ${withAlpha(colors.surfaceDeep, 0.94)}, ${withAlpha(colors.surfaceDeep, 0.9)}),
    ${withAlpha(colors.surfaceDeep, 0.7)};
  box-shadow: 0 20px 80px ${withAlpha(colors.scrim, 0.34)};
  backdrop-filter: blur(18px);
`;

const HeroCopy = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const Eyebrow = styled.div`
  color: ${colors.primary};
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
`;

const HeroDescription = styled.p`
  margin: 0;
  max-width: 52rem;
  color: ${colors.onSurfaceVariant};
  font-size: 1rem;
  line-height: 1.7;
`;

const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  background: ${withAlpha(colors.surfaceDeep, 0.88)};
  color: ${colors.primarySoft};
  font-size: 0.8rem;
  font-weight: 700;
`;

const HeroNote = styled.p`
  margin: 0;
  color: ${colors.onSurfaceVariant};
  font-size: 0.92rem;
  line-height: 1.65;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const AlertCard = styled.div`
  position: relative;
  z-index: 1;
  padding: 1rem 1.15rem;
  border: 1px solid ${withAlpha(colors.error, 0.28)};
  border-radius: 1rem;
  background: ${withAlpha(colors.errorContainer, 0.9)};
  color: ${colors.errorSoft};
  line-height: 1.6;
`;

const StatsGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatTile = styled(StatCard)`
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1.2rem;
  background: ${withAlpha(colors.surfaceDeep, 0.76)};
  backdrop-filter: blur(16px);
`;

const WorkspaceGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 0.92fr);
  align-items: start;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  display: grid;
  gap: 1rem;
`;

const Panel = styled.section`
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1.4rem;
  background: ${withAlpha(colors.surfaceDeep, 0.82)};
  box-shadow: 0 18px 64px ${withAlpha(colors.scrim, 0.24)};
  backdrop-filter: blur(18px);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const PanelEyebrow = styled.div`
  color: ${colors.primary};
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  margin: 0.35rem 0 0;
  font-size: 1.1rem;
  line-height: 1.25;
`;

const PanelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  background: ${withAlpha(colors.surfaceLow, 0.9)};
  color: ${colors.primarySoft};
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FieldBlock = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  color: ${colors.primarySoft};
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 0.95rem 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 0.95rem;
  background: ${withAlpha(colors.surfaceLow, 0.9)};
  color: ${colors.primaryContainer};
  outline: none;

  &::placeholder {
    color: ${colors.onSurfaceVariant};
  }

  &:focus {
    border-color: ${withAlpha(colors.primary, 0.8)};
    box-shadow: 0 0 0 3px ${withAlpha(colors.primary, 0.16)};
  }

  &:disabled {
    opacity: 0.62;
  }
`;

const FieldTextArea = styled.textarea`
  width: 100%;
  min-height: 6.2rem;
  padding: 0.95rem 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 0.95rem;
  background: ${withAlpha(colors.surfaceLow, 0.9)};
  color: ${colors.primaryContainer};
  outline: none;
  resize: vertical;
  line-height: 1.6;

  &::placeholder {
    color: ${colors.onSurfaceVariant};
  }

  &:focus {
    border-color: ${withAlpha(colors.primary, 0.8)};
    box-shadow: 0 0 0 3px ${withAlpha(colors.primary, 0.16)};
  }

  &:disabled {
    opacity: 0.62;
  }
`;

const FieldHint = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.8rem;
  line-height: 1.55;
`;

const KindDescription = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.84rem;
  line-height: 1.55;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`;

const InlineError = styled.div`
  padding: 0.85rem 1rem;
  border: 1px solid ${withAlpha(colors.error, 0.28)};
  border-radius: 0.95rem;
  background: ${withAlpha(colors.errorContainer, 0.9)};
  color: ${colors.errorSoft};
  line-height: 1.55;
`;

const FieldList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const FieldCard = styled.article`
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1rem;
  background: ${withAlpha(colors.surfaceDeep, 0.9)};
`;

const FieldCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const FieldCardTitle = styled.div`
  color: ${colors.primaryContainer};
  font-size: 0.98rem;
  font-weight: 800;
`;

const FieldCardKey = styled.div`
  margin-top: 0.2rem;
  color: ${colors.onSurfaceVariant};
  font-size: 0.8rem;
`;

const FieldTypeBadge = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${({ $accent }) => `${$accent}70`};
  background: ${({ $accent }) => `${$accent}1a`};
  color: ${({ $accent }) => $accent};
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
`;

const FieldCardSummary = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.86rem;
  line-height: 1.6;
`;

const FieldOptionsSummary = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.82rem;
  line-height: 1.6;
`;

const FieldCardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const PreviewSurface = styled.div`
  display: grid;
  gap: 0.95rem;
  padding: 0.25rem;
`;

const PreviewField = styled.div`
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.12)};
  border-radius: 1rem;
  background: ${withAlpha(colors.surfaceDeep, 0.84)};
`;

const PreviewFieldLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${colors.primaryContainer};
  font-size: 0.92rem;
  font-weight: 800;
`;

const PreviewRequiredMark = styled.span`
  color: ${colors.primarySoft};
  font-size: 0.92rem;
`;

const PreviewHelpText = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 0.82rem;
  line-height: 1.55;
`;

const PreviewSelect = styled.select`
  width: 100%;
  padding: 0.88rem 0.95rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.14)};
  border-radius: 0.9rem;
  background: ${withAlpha(colors.background, 0.94)};
  color: ${colors.primaryContainer};
  outline: none;
`;

const PreviewCheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: ${colors.primarySoft};
  font-size: 0.9rem;
  font-weight: 700;
`;

const PreviewRadioGroup = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const PreviewRadioOption = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: ${colors.primarySoft};
  font-size: 0.9rem;
  font-weight: 600;
`;

const PreviewRadioInput = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${colors.warning};
`;

const EmptyState = styled.div`
  padding: 1rem;
  border: 1px dashed ${withAlpha(colors.primarySoft, 0.18)};
  border-radius: 1rem;
  color: ${colors.onSurfaceVariant};
  line-height: 1.6;
`;

const JsonPreview = styled.textarea`
  width: 100%;
  min-height: 34rem;
  padding: 1rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.16)};
  border-radius: 1rem;
  background: ${withAlpha(colors.background, 0.95)};
  color: ${colors.primarySoft};
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  resize: vertical;
  white-space: pre;
  overflow: auto;
`;
