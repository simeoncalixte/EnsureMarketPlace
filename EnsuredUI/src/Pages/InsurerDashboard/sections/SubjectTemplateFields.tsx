import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as S from '../InsurerDashboard.styles';
import {
  loadInsuredSubjectPageTemplate,
  type LineOfBusinessPageTemplate,
  type LineOfBusinessPageTemplateField,
  type LineOfBusinessTaxonomyPrimary,
} from '../lineOfBusinessTaxonomy';
import type { SubjectInput } from '../InsurerDashboard.sectionTypes';
import {
  resolveLineOfBusinessSelection,
  getRenderableTemplateFields,
  getRenderableTemplateSections,
} from '../InsurerDashboard.utils';
import LineOfBusinessSectionGrid from '../LineOfBusinessSectionGrid';
import CollapsibleSection from '../../../xds/components/CollapsibleSection';

export type SubjectTemplateFieldsProps = {
  subject: SubjectInput;
  subjectIndex: number;
  organizationId?: number | null;
  taxonomy: LineOfBusinessTaxonomyPrimary[];
  onFieldValueChange: (subjectIndex: number, fieldKey: string, value: string) => void;
  onTemplateResolved: (subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void;
};

const SubjectTemplateFields = React.memo(function SubjectTemplateFields({
  subject,
  subjectIndex,
  organizationId,
  taxonomy,
  onFieldValueChange,
  onTemplateResolved,
}: SubjectTemplateFieldsProps) {
  const selection = useMemo(
    () => resolveLineOfBusinessSelection(subject.lineOfBusiness, subject.lineOfBusinessSubType, taxonomy),
    [subject.lineOfBusiness, subject.lineOfBusinessSubType, taxonomy],
  );
  const [template, setTemplate] = useState<LineOfBusinessPageTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [collapsedTemplateSectionKeys, setCollapsedTemplateSectionKeys] = useState<Set<string>>(() => new Set());
  const collapsedTemplateScopeRef = useRef<string | null>(null);
  const templateScopeKey = `${selection.primaryCode ?? ''}:${selection.subTypeCode ?? ''}`;
  const hasSelection = Boolean(selection.primaryCode);

  useEffect(() => {
    let active = true;

    // Prefer the inline, pipeline-generated template for THIS submission (the
    // LLM's per-subject form). It is used directly — no fetch, and independent of
    // the LOB selection — so the underwriter sees the bespoke form even before a
    // line of business is reconciled against the taxonomy.
    const inlineTemplate = subject.template ?? null;
    if (inlineTemplate) {
      setTemplate(inlineTemplate);
      setTemplateError(null);
      setLoadingTemplate(false);
      onTemplateResolved(subjectIndex, getRenderableTemplateFields(inlineTemplate, selection));
      return () => {
        active = false;
      };
    }

    if (!selection.primaryCode) {
      setTemplate(null);
      setTemplateError(null);
      setLoadingTemplate(false);
      onTemplateResolved(subjectIndex, []);
      return () => {
        active = false;
      };
    }

    setLoadingTemplate(true);
    setTemplateError(null);
    setTemplate(null);

    void loadInsuredSubjectPageTemplate({
      organizationId: organizationId ?? null,
      lineOfBusinessCode: selection.primaryCode,
      lineOfBusinessSubTypeCode: selection.subTypeCode,
    })
      .then(({ template: loadedTemplate }) => {
        if (!active) {
          return;
        }

        setTemplate(loadedTemplate);
        const renderableFields = getRenderableTemplateFields(loadedTemplate, selection);
        onTemplateResolved(subjectIndex, renderableFields);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setTemplateError(error instanceof Error ? error.message : 'Unable to load template fields.');
        onTemplateResolved(subjectIndex, []);
      })
      .finally(() => {
        if (active) {
          setLoadingTemplate(false);
        }
      });

    return () => {
      active = false;
    };
  }, [onTemplateResolved, selection.primaryCode, selection.subTypeCode, subjectIndex, subject.template]);

  const renderableSections = useMemo(
    () => getRenderableTemplateSections(template, selection),
    [selection.primaryCode, selection.subTypeCode, template],
  );
  const totalSubTypes = useMemo(
    () => taxonomy.reduce((count, primaryType) => count + primaryType.subTypes.length, 0),
    [taxonomy],
  );

  useEffect(() => {
    setCollapsedTemplateSectionKeys((current) => {
      const validSectionKeys = new Set(renderableSections.map((section) => section.key));

      if (!hasSelection) {
        collapsedTemplateScopeRef.current = null;
        return current.size === 0 ? current : new Set();
      }

      if (collapsedTemplateScopeRef.current !== templateScopeKey) {
        if (validSectionKeys.size === 0) {
          return current;
        }

        collapsedTemplateScopeRef.current = templateScopeKey;
        return new Set(validSectionKeys);
      }

      let changed = false;
      const next = new Set<string>();

      current.forEach((sectionKey) => {
        if (validSectionKeys.has(sectionKey)) {
          next.add(sectionKey);
        } else {
          changed = true;
        }
      });

      if (!changed && next.size === current.size) {
        return current;
      }

      return next;
    });
  }, [hasSelection, renderableSections, templateScopeKey]);

  const toggleTemplateSectionCollapsed = useCallback((sectionKey: string) => {
    setCollapsedTemplateSectionKeys((current) => {
      const next = new Set(current);

      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }

      return next;
    });
  }, []);

  if (!template && !selection.primaryCode) {
    return (
      <S.InfoBoxDashed>
        Select a line of business and subtype to load the insured subject template fields.
      </S.InfoBoxDashed>
    );
  }

  if (loadingTemplate && !template) {
    return (
      <S.InfoBoxPrimary>
        Loading template fields for {subject.lineOfBusiness || 'the selected line of business'}...
      </S.InfoBoxPrimary>
    );
  }

  if (templateError && !template) {
    return (
      <S.InfoBoxError>
        {templateError}
      </S.InfoBoxError>
    );
  }

  if (renderableSections.length === 0) {
    return (
      <S.InfoBoxDashed>
        No additional subject fields are configured for this selection.
      </S.InfoBoxDashed>
    );
  }

  return (
    <S.SectionDivider>
      <S.FlexBetween>
        <div>
          <S.FieldGroupLabel>Template fields</S.FieldGroupLabel>
          <S.FieldGroupTitle>{template?.title ?? 'Insured subject template'}</S.FieldGroupTitle>
        </div>
        {template?.pageKey ? <S.PageKeyText>{template.pageKey}</S.PageKeyText> : null}
      </S.FlexBetween>

      {renderableSections.map((section) => {
        const isCollapsed = collapsedTemplateSectionKeys.has(section.key);

        return (
          <CollapsibleSection
            key={section.key}
            title={section.label}
            description={section.description ? section.description : undefined}
            collapsed={isCollapsed}
            onToggle={() => toggleTemplateSectionCollapsed(section.key)}
            tone="primary"
          >
            <LineOfBusinessSectionGrid
              section={section}
              primaryTypeCount={taxonomy.length}
              totalSubTypes={totalSubTypes}
              displayMode="rendered"
              showHeader={false}
              showModeDescription={false}
              renderedFieldValues={subject.fieldValues}
              onRenderedFieldValueChange={(fieldKey, nextValue) => onFieldValueChange(subjectIndex, fieldKey, nextValue)}
            />
          </CollapsibleSection>
        );
      })}
    </S.SectionDivider>
  );
});

export default SubjectTemplateFields;
