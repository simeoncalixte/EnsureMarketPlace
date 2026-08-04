import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { createDeal, getCapitalExposureSummary } from '../../api/marketplace';
import { useAuthMe } from '../../lib/useAuthMe';
import * as S from './InsurerDashboard.styles';
import { colors } from '../../xds/colors';
import Button from '../../xds/components/Button';
import SubNavigation from '../../xds/components/SubNavigation';
import type {
  DealSubmissionSeed,
  SubjectGroup,
  SubjectGroupingMode,
  SubjectInput,
  SubjectTextFieldKey,
  TrancheInput,
  TrancheSubjectSelectionMode,
} from './InsurerDashboard.sectionTypes';
import SubjectInsuranceSection from './sections/SubjectInsuranceSection';
import DynamicFormSection from './sections/DynamicFormSection';
import DealParametersSection from './sections/DealParametersSection';
import DocumentsSection from './sections/DocumentsSection';
import FinancialsSection from './sections/FinancialsSection';
import TrancheStructureSection from './sections/TrancheStructureSection';
import ValidationSection from './sections/ValidationSection';
import SubmissionSection from './sections/SubmissionSection';
import SigningSection from './sections/SigningSection';
import LiveSummaryAside from './sections/LiveSummaryAside';
import {
  loadLineOfBusinessTaxonomy,
  type LineOfBusinessPageTemplateField,
  type LineOfBusinessTaxonomyPrimary,
} from './lineOfBusinessTaxonomy';
import {
  loadBaselineSuggestedForm,
  loadSubmissionSuggestedForm,
  loadSubmissionInsuredSubjects,
  loadSuggestedFormFieldImpact,
  removeSuggestedFormField,
  removeSubjectFormField,
  type SuggestedForm,
  type SuggestedFormField,
  type SuggestedFormSection,
} from '../../api/pipeline';
import {
  formatNumberInput,
  createStableId,
  resolveLineOfBusinessSelection,
  createSubjectDraft,
  buildDefaultSubjects,
  subjectsFromInsuredSubjects,
  normalizeSubject,
  groupSubjectsByLocation,
  mergeTemplateFieldValues,
  buildDefaultTranches,
} from './InsurerDashboard.utils';

type CreateDealLocationState = {
  sourceSubmission?: DealSubmissionSeed;
};

export default function InsurerDashboard() {
  const location = useLocation();
  const { user } = useAuthMe();
  const sourceSubmission = (location.state as CreateDealLocationState | null | undefined)?.sourceSubmission ?? null;

  const [name, setName] = useState(() => sourceSubmission?.submissionNumber ?? 'TRX-9902');
  const [cedingEntity, setCedingEntity] = useState(() => sourceSubmission?.cedent ?? 'Munich Re Institutional');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [coverageLimit, setCoverageLimit] = useState(() => formatNumberInput(sourceSubmission?.exposure ?? 950000000));
  const [attachmentPoint, setAttachmentPoint] = useState(() => formatNumberInput((sourceSubmission?.exposure ?? 500000000) * 0.55));
  const [exhaustionPoint, setExhaustionPoint] = useState(() => formatNumberInput((sourceSubmission?.exposure ?? 1200000000) * 1.25));
  const [premium, setPremium] = useState(() => formatNumberInput(sourceSubmission?.premium ?? 12000000));
  const [lineOfBusinessTaxonomy, setLineOfBusinessTaxonomy] = useState<LineOfBusinessTaxonomyPrimary[]>([]);
  const [subjects, setSubjects] = useState<SubjectInput[]>(() => buildDefaultSubjects(sourceSubmission));
  const [subjectGroupingMode, setSubjectGroupingMode] = useState<SubjectGroupingMode>('location');
  const sourceLineOfBusinessSelection = useMemo(
    () =>
      sourceSubmission
        ? resolveLineOfBusinessSelection(sourceSubmission.lineOfBusiness, '', lineOfBusinessTaxonomy)
        : { primary: '', primaryCode: '', subType: '', subTypeCode: '' },
    [sourceSubmission, lineOfBusinessTaxonomy],
  );
  // Template section key. Lands on the platform default General Information section.
  const [activeSection, setActiveSection] = useState<string>('general-information');

  // The resolved create-coverage template for this view. The platform baseline
  // loads first; a submission-specific generated schema replaces it when present.
  const [suggestedForm, setSuggestedForm] = useState<SuggestedForm | null>(null);
  useEffect(() => {
    const submissionId = sourceSubmission?.submissionId;
    let cancelled = false;

    async function loadResolvedTemplate() {
      const baseline = await loadBaselineSuggestedForm({
        lineOfBusinessCode: sourceLineOfBusinessSelection.primaryCode || null,
        lineOfBusinessLabel: sourceSubmission?.lineOfBusiness ?? null,
        lineOfBusinessSubTypeCode: sourceLineOfBusinessSelection.subTypeCode || null,
        subjectCount: subjects.length,
        organizationId: user?.organizationId ?? null,
      });
      if (!cancelled && baseline) {
        setSuggestedForm(baseline);
      }

      if (submissionId == null) return;
      const generated = await loadSubmissionSuggestedForm(submissionId);
      if (!cancelled && generated) {
        setSuggestedForm(generated);
      }
    }

    void loadResolvedTemplate();
    return () => {
      cancelled = true;
    };
  }, [
    sourceLineOfBusinessSelection.primaryCode,
    sourceLineOfBusinessSelection.subTypeCode,
    sourceSubmission?.lineOfBusiness,
    sourceSubmission?.submissionId,
    subjects.length,
    user?.organizationId,
  ]);

  // Hydrate the subject cards from the pipeline's extracted insured subjects:
  // each subject's own line of business and its attributes as editable values.
  // Waits for the taxonomy so the LLM's LOB code resolves to a selection. No-ops
  // (keeps the blank default) when the stage has not run or found no subjects.
  useEffect(() => {
    const submissionId = sourceSubmission?.submissionId;
    if (submissionId == null || lineOfBusinessTaxonomy.length === 0) return;
    let cancelled = false;
    loadSubmissionInsuredSubjects(submissionId).then((result) => {
      if (cancelled || !result || result.subjects.length === 0) return;
      setSubjects(subjectsFromInsuredSubjects(result, lineOfBusinessTaxonomy));
    });
    return () => {
      cancelled = true;
    };
  }, [sourceSubmission?.submissionId, lineOfBusinessTaxonomy]);

  const templateSections = useMemo(
    () => [...(suggestedForm?.schema.sections ?? [])].sort((left, right) => left.order - right.order),
    [suggestedForm],
  );
  const templateSectionByKey = useMemo(
    () => new Map(templateSections.map((section): [string, SuggestedFormSection] => [section.key, section])),
    [templateSections],
  );
  const sectionTabs = useMemo(
    () => templateSections.map((section) => ({ id: section.key, label: section.label })),
    [templateSections],
  );
  useEffect(() => {
    if (templateSections.length === 0) return;
    if (!templateSectionByKey.has(activeSection)) {
      setActiveSection(templateSections[0].key);
    }
  }, [activeSection, templateSectionByKey, templateSections]);
  const generalSectionKey = templateSectionByKey.has('general-information') ? 'general-information' : 'deal-parameters';
  // General Information renders the classic five fields via its hardcoded
  // component; everything else in the section (AI extensions AND the newer base
  // defaults like broker/jurisdiction/currency/notes) renders dynamically below it.
  const generalExtras = useMemo(() => {
    const hardcodedKeys = new Set(['dealName', 'cedingEntity', 'effectiveDate', 'expirationDate', 'perilType']);
    const section = suggestedForm?.schema.sections.find(
      (s) => s.key === 'general-information' || s.key === 'deal-parameters',
    );
    return section ? section.fields.filter((f) => f.origin === 'ai' || !hardcodedKeys.has(f.key)) : [];
  }, [suggestedForm]);
  const financialsExtras = useMemo(() => {
    const hardcodedKeys = new Set(['coverageLimit', 'attachmentPoint', 'exhaustionPoint', 'premium']);
    const section = templateSectionByKey.get('financials');
    return section ? section.fields.filter((field) => field.origin === 'ai' || !hardcodedKeys.has(field.key)) : [];
  }, [templateSectionByKey]);

  // Remove an AI/custom field from the org's create-coverage template, going
  // forward. We first surface how many existing submissions use it (their data is
  // preserved), confirm, then call the API and drop the field from the on-screen
  // form. Org/LOB coordinates come from the loaded form.
  const handleRemoveField = useCallback(
    async (sectionKey: string, field: SuggestedFormField) => {
      const organizationId = user?.organizationId ?? null;
      if (organizationId == null) {
        setMessage('Cannot remove field: no organization context.');
        return;
      }
      const impact = await loadSuggestedFormFieldImpact({ organizationId, sectionKey, fieldKey: field.key });
      const used =
        impact.dependentSubmissionCount > 0
          ? `${impact.dependentSubmissionCount} existing submission(s) use this field; their data is kept. `
          : '';
      const confirmed = window.confirm(
        `Remove "${field.label}" from the create-coverage form for future submissions of this line of business?\n\n${used}This cannot be undone from here.`,
      );
      if (!confirmed) return;

      const ok = await removeSuggestedFormField({
        organizationId,
        lineOfBusinessCode: suggestedForm?.lineOfBusinessCode ?? '',
        lineOfBusinessSubTypeCode: suggestedForm?.lineOfBusinessSubTypeCode ?? '',
        sectionKey,
        fieldKey: field.key,
      });
      if (!ok) {
        setMessage(`Could not remove "${field.label}". It may be a protected field.`);
        return;
      }
      // Drop it from the on-screen form so it disappears immediately.
      setSuggestedForm((prev) =>
        prev
          ? {
              ...prev,
              schema: {
                ...prev.schema,
                sections: prev.schema.sections.map((s) =>
                  s.key === sectionKey ? { ...s, fields: s.fields.filter((f) => f.key !== field.key) } : s,
                ),
              },
            }
          : prev,
      );
      setMessage(`Removed "${field.label}" from the template for future submissions.`);
    },
    [user?.organizationId, suggestedForm?.lineOfBusinessCode, suggestedForm?.lineOfBusinessSubTypeCode],
  );

  const [tranches, setTranches] = useState<TrancheInput[]>(() => buildDefaultTranches(sourceSubmission?.exposure ?? 950000000));

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exposure, setExposure] = useState<number | null>(null);
  const [exposureLoading, setExposureLoading] = useState(false);

  const addTranche = useCallback(() =>
    setTranches((s) => [
      ...s,
      {
        trancheId: createStableId('tranche'),
        name: 'New Tranche',
        layerMin: '',
        layerMax: '',
        returnRate: '',
        riskLevel: 'medium',
        capitalRequired: '',
        subjectSelectionMode: 'all',
        selectedSubjectIds: [],
      },
    ]),
  []);
  const removeTranche = useCallback((idx: number) => setTranches((s) => s.filter((_, i) => i !== idx)), []);
  const updateTranche = useCallback((idx: number, key: keyof TrancheInput, value: string) =>
    setTranches((s) => s.map((t, i) => (i === idx ? { ...t, [key]: value } : t))),
  []);
  const updateTrancheSubjectSelectionMode = useCallback((idx: number, mode: TrancheSubjectSelectionMode) =>
    setTranches((s) =>
      s.map((tranche, i) => {
        if (i !== idx) {
          return tranche;
        }

        return {
          ...tranche,
          subjectSelectionMode: mode,
          selectedSubjectIds: mode === 'all'
            ? []
            : tranche.selectedSubjectIds.length > 0
              ? tranche.selectedSubjectIds
              : subjects.map((subject) => subject.subjectId),
        };
      }),
    ),
  [subjects]);
  const updateTrancheSubjectSelection = useCallback((idx: number, subjectId: string, checked: boolean) =>
    setTranches((s) =>
      s.map((tranche, i) => {
        if (i !== idx) {
          return tranche;
        }

        const nextSelectedSubjectIds = checked
          ? Array.from(new Set([...tranche.selectedSubjectIds, subjectId]))
          : tranche.selectedSubjectIds.filter((id) => id !== subjectId);

        return {
          ...tranche,
          subjectSelectionMode: 'selective',
          selectedSubjectIds: nextSelectedSubjectIds,
        };
      }),
    ),
  []);
  const addSubject = useCallback(() => {
    setSubjects((s) => [...s, createSubjectDraft(s.length, sourceSubmission, lineOfBusinessTaxonomy)]);
  }, [lineOfBusinessTaxonomy, sourceSubmission]);
  const setLocationGroupingMode = useCallback(() => setSubjectGroupingMode('location'), []);
  const setSeparateGroupingMode = useCallback(() => setSubjectGroupingMode('separate'), []);
  const removeSubject = useCallback((idx: number) =>
    setSubjects((current) => {
      if (current.length <= 1) {
        return current;
      }

      const removedSubjectId = current[idx]?.subjectId;
      if (removedSubjectId) {
        setTranches((trancheState) =>
          trancheState.map((tranche) => ({
            ...tranche,
            selectedSubjectIds: tranche.selectedSubjectIds.filter((id) => id !== removedSubjectId),
          })),
        );
      }

      return current.filter((_, i) => i !== idx);
    }),
  []);
  const updateSubject = useCallback((idx: number, key: SubjectTextFieldKey, value: string) =>
    setSubjects((s) => s.map((subject, i) => (i === idx ? { ...subject, [key]: value } : subject))),
  []);
  const updateSubjectPrimaryLineOfBusiness = useCallback((idx: number, value: string) =>
    setSubjects((s) =>
      s.map((subject, i) => {
        if (i !== idx) {
          return subject;
        }

        const selectedPrimary = lineOfBusinessTaxonomy.find((primary) => primary.label === value);
        return {
          ...subject,
          lineOfBusiness: value,
          lineOfBusinessSubType: selectedPrimary?.subTypes[0]?.label ?? '',
          fieldValues: {},
        };
      }),
    ),
  [lineOfBusinessTaxonomy]);
  const updateSubjectLineOfBusinessSubType = useCallback((idx: number, value: string) =>
    setSubjects((s) =>
      s.map((subject, i) =>
        i === idx
          ? {
              ...subject,
              lineOfBusinessSubType: value,
              fieldValues: {},
            }
          : subject,
      ),
    ),
  []);

  const handleSubjectTemplateResolved = useCallback((subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => {
    setSubjects((current) =>
      current.map((subject, index) => {
        if (index !== subjectIndex) {
          return subject;
        }

        const nextFieldValues = mergeTemplateFieldValues(subject.fieldValues, fields);
        const currentKeys = Object.keys(subject.fieldValues);
        const nextKeys = Object.keys(nextFieldValues);
        const valuesChanged = currentKeys.length !== nextKeys.length || nextKeys.some((key) => subject.fieldValues[key] !== nextFieldValues[key]);

        if (!valuesChanged) {
          return subject;
        }

        return {
          ...subject,
          fieldValues: nextFieldValues,
        };
      }),
    );
  }, []);

  const handleSubjectTemplateFieldValueChange = useCallback((subjectIndex: number, fieldKey: string, value: string) => {
    setSubjects((current) =>
      current.map((subject, index) => {
        if (index !== subjectIndex) {
          return subject;
        }

        if (subject.fieldValues[fieldKey] === value) {
          return subject;
        }

        return {
          ...subject,
          fieldValues: {
            ...subject.fieldValues,
            [fieldKey]: value,
          },
        };
      }),
    );
  }, []);

  // Remove an AI-generated subject field from the org insured-subject template
  // going forward. On screen, optimistically drop the value for this subject.
  const handleRemoveSubjectField = useCallback(
    (subjectIndex: number, sectionKey: string, field: LineOfBusinessPageTemplateField) => {
      const confirmed = window.confirm(
        `Remove "${field.label}" from the insured-subject form for future submissions of this line of business?`,
      );
      if (!confirmed) return;

      const organizationId = user?.organizationId ?? null;
      const subject = subjects[subjectIndex];
      if (organizationId != null && subject) {
        void removeSubjectFormField({
          organizationId,
          lineOfBusinessCode: subject.lineOfBusiness ?? '',
          lineOfBusinessSubTypeCode: subject.lineOfBusinessSubType ?? '',
          sectionKey,
          fieldKey: field.key,
        });
      }

      setSubjects((current) =>
        current.map((s, i) => {
          if (i !== subjectIndex) return s;
          const nextValues = { ...s.fieldValues };
          delete nextValues[field.key];
          return { ...s, fieldValues: nextValues };
        }),
      );
      setMessage(`Removed "${field.label}" from the subject form.`);
    },
    [user?.organizationId, subjects],
  );

  useEffect(() => {
    let active = true;

    void loadLineOfBusinessTaxonomy().then((taxonomy) => {
      if (!active) {
        return;
      }

      setLineOfBusinessTaxonomy(taxonomy);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sourceSubmission || lineOfBusinessTaxonomy.length === 0) {
      return;
    }

    const selection = resolveLineOfBusinessSelection(sourceSubmission.lineOfBusiness, '', lineOfBusinessTaxonomy);
    if (!selection.primary) {
      return;
    }

    setSubjects((current) =>
      current.map((subject, index) => {
        if (index !== 0 || subject.lineOfBusiness || subject.lineOfBusinessSubType) {
          return subject;
        }

        return {
          ...subject,
          lineOfBusiness: selection.primary,
          lineOfBusinessSubType: selection.subType,
        };
      }),
    );
  }, [sourceSubmission?.submissionId, lineOfBusinessTaxonomy]);

  useEffect(() => {
    if (!sourceSubmission) {
      return;
    }

    setName(sourceSubmission.submissionNumber);
    setCedingEntity(sourceSubmission.cedent);
    setCoverageLimit(formatNumberInput(sourceSubmission.exposure));
    setAttachmentPoint(formatNumberInput(sourceSubmission.exposure * 0.55));
    setExhaustionPoint(formatNumberInput(sourceSubmission.exposure * 1.25));
    setPremium(formatNumberInput(sourceSubmission.premium));
    setSubjects(buildDefaultSubjects(sourceSubmission));
    setTranches(buildDefaultTranches(sourceSubmission.exposure));
  }, [sourceSubmission?.submissionId]);

  const submitDeal = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const invalidSelectiveTranche = tranches.find(
        (tranche) => tranche.subjectSelectionMode === 'selective' && tranche.selectedSubjectIds.length === 0,
      );
      if (invalidSelectiveTranche) {
        throw new Error(`Select at least one subject for ${invalidSelectiveTranche.name}.`);
      }

      const subjectsPayload = subjects.map((subject, index) => normalizeSubject(subject, index));
      const allSubjectIds = subjects.map((subject) => subject.subjectId);
      const payload = {
        name,
        coverageLimit: Number(coverageLimit),
        attachmentPoint: Number(attachmentPoint),
        exhaustionPoint: Number(exhaustionPoint),
        premium: Number(premium),
        startDate,
        endDate,
        subjects: subjectsPayload,
        tranches: tranches.map((t) => ({
          subjectSelectionJson: {
            mode: t.subjectSelectionMode,
            subjectIds: t.subjectSelectionMode === 'all' ? allSubjectIds : t.selectedSubjectIds,
          },
          name: t.name,
          layerMin: Number(t.layerMin),
          layerMax: Number(t.layerMax),
          returnRate: Number(t.returnRate) || 0,
          riskLevel: t.riskLevel,
          capitalRequired: t.capitalRequired ? Number(t.capitalRequired) : undefined,
        })),
      };

      const res = await createDeal(payload);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Status ${res.status}`);
      }

      const data = await res.json();
      setMessage(`Deal created (id: ${data.deal?.id ?? 'unknown'}, subjects: ${Array.isArray(data.deal?.subjectsJson) ? data.deal.subjectsJson.length : subjectsPayload.length})`);
    } catch (err: any) {
      setMessage(`Error: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [attachmentPoint, coverageLimit, endDate, exhaustionPoint, name, premium, startDate, subjects, tranches]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitDeal();
  }, [submitDeal]);

  const fetchExposure = async () => {
    try {
      setExposureLoading(true);
      const res = await getCapitalExposureSummary();
      if (!res.ok) return;
      const data = await res.json();
      const value = Number(data?.totalAvailable ?? data?.totalCapitalRequired ?? 0);
      if (!Number.isFinite(value)) return;
      setExposure(value);
    } catch (err) {
      // ignore - keep previous value
    } finally {
      setExposureLoading(false);
    }
  };

  useEffect(() => {
    fetchExposure();
    const t = setInterval(fetchExposure, 30000);
    return () => clearInterval(t);
  }, []);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const parsedCoverageLimit = Number(coverageLimit);
  const liveExposureValue = exposure ?? sourceSubmission?.exposure ?? (Number.isFinite(parsedCoverageLimit) ? parsedCoverageLimit : 0);
  const subjectPreview = subjects.map((subject) => subject.subjectLabel.trim()).filter((label) => label.length > 0).slice(0, 2).join(' • ');

  const groupedSubjects = useMemo(() => {
    if (subjectGroupingMode === 'separate') {
      return subjects.map((subject, index): SubjectGroup => ({
        key: `${subject.subjectId}-${index}`,
        label: subject.subjectLabel || `Subject ${index + 1}`,
        subjects: [{ subject, index }],
      }));
    }

    return groupSubjectsByLocation(subjects);
  }, [subjectGroupingMode, subjects]);

  const taxonomyByPrimaryLabel = useMemo<Map<string, LineOfBusinessTaxonomyPrimary>>(
    () => new Map<string, LineOfBusinessTaxonomyPrimary>(lineOfBusinessTaxonomy.map((primary): [string, LineOfBusinessTaxonomyPrimary] => [primary.label, primary])),
    [lineOfBusinessTaxonomy],
  );

  const validationChecks = [
    { label: 'Subject structure', value: `${subjects.length} subject${subjects.length === 1 ? '' : 's'} mapped` },
    { label: 'Tranche ladder', value: `${tranches.length} layer${tranches.length === 1 ? '' : 's'} ready` },
    { label: 'Live exposure', value: fmtCurrency(liveExposureValue) },
    { label: 'Source feed', value: sourceSubmission ? sourceSubmission.submissionNumber : 'Manual draft' },
  ];

  const signingChecks = [
    { label: 'Underwriter', value: 'Ready for review' },
    { label: 'Cedent', value: sourceSubmission ? sourceSubmission.cedent : 'Invite on submission' },
    { label: 'Execution packet', value: 'Queued after submission' },
  ];

  const workflowChecks = [
    { label: 'Validation', value: 'Complete', color: colors.accent },
    { label: 'Submission', value: 'Open', color: colors.primary },
    { label: 'Signing', value: 'Pending', color: colors.onSurfaceMuted },
  ];

  // Component-backed defaults retain their purpose-built UI, while schema-agent
  // fields render directly beneath it. This lets the agent extend every default
  // template section without replacing any existing workflow component.
  const renderComponentExtensions = (section: SuggestedFormSection) =>
    section.fields.length > 0 ? (
      <DynamicFormSection
        isActive={activeSection === section.key}
        label="Additional fields"
        fields={section.fields}
        badge={section.fields.some((field) => field.origin === 'ai') ? 'ai' : null}
        inline
        organizationId={user?.organizationId ?? null}
        sectionKey={section.key}
        onRemoveField={handleRemoveField}
      />
    ) : null;

  return (
    <>
      <S.ContentArea>
          <S.LeftColumn>
            {sourceSubmission ? (
              <S.PreloadedSubmissionBox>
                <S.PreloadedLabel>Preloaded submission</S.PreloadedLabel>
                <S.PreloadedValue>{sourceSubmission.submissionNumber}</S.PreloadedValue>
                <S.PreloadedSecondary>{sourceSubmission.cedent}</S.PreloadedSecondary>
                <S.PreloadedMeta>
                  Line of Business {sourceSubmission.lineOfBusiness} • Location {sourceSubmission.locationText ?? sourceSubmission.region}
                </S.PreloadedMeta>
                <S.PreloadedMeta>
                  Region {sourceSubmission.region} • Owner {sourceSubmission.owner}
                </S.PreloadedMeta>
                <S.PreloadedNotes>{sourceSubmission.notes}</S.PreloadedNotes>
                <S.PreloadedMeta>
                  Premium {fmtCurrency(sourceSubmission.premium)} • Exposure {fmtCurrency(sourceSubmission.exposure)} • Subjects {subjects.length} • Received {sourceSubmission.receivedLabel}
                </S.PreloadedMeta>
              </S.PreloadedSubmissionBox>
            ) : null}
            <S.SubNavWrap>
              <SubNavigation
                tabs={sectionTabs}
                activeId={activeSection}
                onChange={(id) => setActiveSection(id)}
              />
            </S.SubNavWrap>
            <S.Form onSubmit={handleSubmit}>
              {templateSections.map((section) => {
                switch (section.key) {
                  case 'general-information':
                  case 'deal-parameters':
                    return (
                      <React.Fragment key={section.key}>
                        <DealParametersSection
                          isActive={activeSection === section.key}
                          name={name}
                          cedingEntity={cedingEntity}
                          startDate={startDate}
                          endDate={endDate}
                          sourceCedent={sourceSubmission?.cedent}
                          onSetName={setName}
                          onSetCedingEntity={setCedingEntity}
                          onSetStartDate={setStartDate}
                          onSetEndDate={setEndDate}
                        />
                        {generalExtras.length > 0 ? (
                          <DynamicFormSection
                            isActive={activeSection === section.key}
                            label="Additional fields"
                            fields={generalExtras}
                            badge={generalExtras.some((f) => f.origin === 'ai') ? 'ai' : null}
                            inline
                            organizationId={user?.organizationId ?? null}
                            sectionKey={generalSectionKey}
                            onRemoveField={handleRemoveField}
                          />
                        ) : null}
                      </React.Fragment>
                    );
                  case 'financials':
                    return (
                      <React.Fragment key={section.key}>
                        <FinancialsSection
                          isActive={activeSection === section.key}
                          coverageLimit={coverageLimit}
                          attachmentPoint={attachmentPoint}
                          exhaustionPoint={exhaustionPoint}
                          premium={premium}
                          onSetCoverageLimit={setCoverageLimit}
                          onSetAttachmentPoint={setAttachmentPoint}
                          onSetExhaustionPoint={setExhaustionPoint}
                          onSetPremium={setPremium}
                        />
                        {financialsExtras.length > 0 ? (
                          <DynamicFormSection
                            isActive={activeSection === section.key}
                            label="Additional fields"
                            fields={financialsExtras}
                            badge={financialsExtras.some((f) => f.origin === 'ai') ? 'ai' : null}
                            inline
                            organizationId={user?.organizationId ?? null}
                            sectionKey="financials"
                            onRemoveField={handleRemoveField}
                          />
                        ) : null}
                      </React.Fragment>
                    );
                  case 'insured-subjects':
                    return (
                      <React.Fragment key={section.key}>
                        <SubjectInsuranceSection
                          isActive={activeSection === section.key}
                          subjectGroupingMode={subjectGroupingMode}
                          groupedSubjects={groupedSubjects}
                          organizationId={user?.organizationId ?? null}
                          taxonomyByPrimaryLabel={taxonomyByPrimaryLabel}
                          lineOfBusinessTaxonomy={lineOfBusinessTaxonomy}
                          onSetLocationGrouping={setLocationGroupingMode}
                          onSetSeparateGrouping={setSeparateGroupingMode}
                          onAddSubject={addSubject}
                          onRemoveSubject={removeSubject}
                          onUpdateSubject={updateSubject}
                          onUpdateSubjectPrimaryLineOfBusiness={updateSubjectPrimaryLineOfBusiness}
                          onUpdateSubjectLineOfBusinessSubType={updateSubjectLineOfBusinessSubType}
                          onFieldValueChange={handleSubjectTemplateFieldValueChange}
                          onTemplateResolved={handleSubjectTemplateResolved}
                          onRemoveSubjectField={handleRemoveSubjectField}
                        />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  case 'documents':
                    return (
                      <React.Fragment key={section.key}>
                        <DocumentsSection
                          isActive={activeSection === section.key}
                          submissionId={sourceSubmission?.submissionId ?? null}
                        />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  case 'tranche-structure':
                    return (
                      <React.Fragment key={section.key}>
                        <TrancheStructureSection
                          isActive={activeSection === section.key}
                          tranches={tranches}
                          subjects={subjects}
                          groupedSubjects={groupedSubjects}
                          subjectGroupingMode={subjectGroupingMode}
                          onAddTranche={addTranche}
                          onUpdateTrancheSubjectSelectionMode={updateTrancheSubjectSelectionMode}
                          onUpdateTranche={updateTranche}
                          onUpdateTrancheSubjectSelection={updateTrancheSubjectSelection}
                        />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  case 'validation':
                    return (
                      <React.Fragment key={section.key}>
                        <ValidationSection
                          isActive={activeSection === section.key}
                          exposureLoading={exposureLoading}
                          liveExposureDisplay={fmtCurrency(liveExposureValue)}
                          sourceLabel={sourceSubmission ? `Seeded from ${sourceSubmission.submissionNumber}` : 'Manual draft'}
                          subjectCount={subjects.length}
                          trancheCount={tranches.length}
                          sourceTypeLabel={sourceSubmission ? sourceSubmission.lineOfBusiness : 'Draft'}
                          subjectPreview={subjectPreview || 'No subject labels have been configured yet.'}
                          checks={validationChecks}
                        />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  case 'submission':
                    return (
                      <React.Fragment key={section.key}>
                        <SubmissionSection
                          isActive={activeSection === section.key}
                          liveExposureDisplay={fmtCurrency(liveExposureValue)}
                          premiumDisplay={fmtCurrency(Number(premium) || 0)}
                          subjectCount={subjects.length}
                          trancheCount={tranches.length}
                          loading={loading}
                          message={message}
                          onSubmit={() => {
                            void submitDeal();
                          }}
                        />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  case 'signing':
                    return (
                      <React.Fragment key={section.key}>
                        <SigningSection isActive={activeSection === section.key} checks={signingChecks} />
                        {renderComponentExtensions(section)}
                      </React.Fragment>
                    );
                  default:
                    return (
                      <DynamicFormSection
                        key={section.key}
                        isActive={activeSection === section.key}
                        label={section.label}
                        description={section.description}
                        fields={section.fields}
                        repeatable={section.repeatable}
                        badge={section.origin === 'ai' ? 'ai' : null}
                        organizationId={user?.organizationId ?? null}
                        sectionKey={section.key}
                        onRemoveField={handleRemoveField}
                      />
                    );
                }
              })}
            </S.Form>
          </S.LeftColumn>
      </S.ContentArea>

      <S.MobileBottomBar>
        <S.Icon className="material-symbols-outlined">settings_input_component</S.Icon>
        <S.Icon className="material-symbols-outlined">analytics</S.Icon>
        <S.Icon className="material-symbols-outlined">account_balance</S.Icon>
        <S.Icon className="material-symbols-outlined">upload_file</S.Icon>
        <S.Icon className="material-symbols-outlined">verified_user</S.Icon>
      </S.MobileBottomBar>
    </>
  );
}
