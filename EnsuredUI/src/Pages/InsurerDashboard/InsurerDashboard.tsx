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
import { createDealSectionTabs } from './InsurerDashboard.constants';
import { loadSubmissionSuggestedForm, type SuggestedForm, type SuggestedFormField } from '../../api/pipeline';
import {
  formatNumberInput,
  createStableId,
  inferPeril,
  resolveLineOfBusinessSelection,
  createSubjectDraft,
  buildDefaultSubjects,
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
  const [peril, setPeril] = useState(() => (sourceSubmission ? inferPeril(sourceSubmission.lineOfBusiness) : 'US WIND'));
  const [coverageLimit, setCoverageLimit] = useState(() => formatNumberInput(sourceSubmission?.exposure ?? 950000000));
  const [attachmentPoint, setAttachmentPoint] = useState(() => formatNumberInput((sourceSubmission?.exposure ?? 500000000) * 0.55));
  const [exhaustionPoint, setExhaustionPoint] = useState(() => formatNumberInput((sourceSubmission?.exposure ?? 1200000000) * 1.25));
  const [premium, setPremium] = useState(() => formatNumberInput(sourceSubmission?.premium ?? 12000000));
  const [lineOfBusinessTaxonomy, setLineOfBusinessTaxonomy] = useState<LineOfBusinessTaxonomyPrimary[]>([]);
  const [subjects, setSubjects] = useState<SubjectInput[]>(() => buildDefaultSubjects(sourceSubmission));
  const [subjectGroupingMode, setSubjectGroupingMode] = useState<SubjectGroupingMode>('location');
  // String (not CreateDealSectionId) because the AI may contribute extra tabs.
  // Lands on Deal Parameters, prefilled from the submission.
  const [activeSection, setActiveSection] = useState<string>('deal');

  // The pipeline-generated schema for this submission: AI fields injected into the
  // base tabs, plus any wholly-new AI sections that become their own tabs.
  const [suggestedForm, setSuggestedForm] = useState<SuggestedForm | null>(null);
  useEffect(() => {
    const submissionId = sourceSubmission?.submissionId;
    if (submissionId == null) return;
    let cancelled = false;
    loadSubmissionSuggestedForm(submissionId).then((form) => {
      if (!cancelled) setSuggestedForm(form);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceSubmission?.submissionId]);

  const BASE_SECTION_KEYS = useMemo(
    () => new Set(['deal-parameters', 'financials', 'insured-subjects', 'tranche-structure', 'validation', 'submission', 'signing']),
    [],
  );
  const aiFieldsFor = useCallback(
    (sectionKey: string): SuggestedFormField[] => {
      const section = suggestedForm?.schema.sections.find((s) => s.key === sectionKey);
      return section ? section.fields.filter((f) => f.origin === 'ai') : [];
    },
    [suggestedForm],
  );
  const dealExtensions = useMemo(() => aiFieldsFor('deal-parameters'), [aiFieldsFor]);
  const financialsExtensions = useMemo(() => aiFieldsFor('financials'), [aiFieldsFor]);
  // Wholly-new AI sections (not one of the seven base sections) -> their own tabs.
  const aiSections = useMemo(
    () => (suggestedForm?.schema.sections ?? []).filter((s) => s.origin === 'ai' && !BASE_SECTION_KEYS.has(s.key) && s.fields.length > 0),
    [suggestedForm, BASE_SECTION_KEYS],
  );
  const sectionTabs = useMemo(
    () => [...createDealSectionTabs, ...aiSections.map((s) => ({ id: s.key, label: s.label }))],
    [aiSections],
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
    setPeril(inferPeril(sourceSubmission.lineOfBusiness));
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
              <DealParametersSection
                isActive={activeSection === 'deal'}
                name={name}
                cedingEntity={cedingEntity}
                startDate={startDate}
                endDate={endDate}
                peril={peril}
                sourceCedent={sourceSubmission?.cedent}
                onSetName={setName}
                onSetCedingEntity={setCedingEntity}
                onSetStartDate={setStartDate}
                onSetEndDate={setEndDate}
                onSetPeril={setPeril}
              />
              {dealExtensions.length > 0 ? (
                <DynamicFormSection
                  isActive={activeSection === 'deal'}
                  label="AI-suggested fields"
                  fields={dealExtensions}
                  badge="ai"
                  inline
                />
              ) : null}

              <FinancialsSection
                isActive={activeSection === 'financials'}
                coverageLimit={coverageLimit}
                attachmentPoint={attachmentPoint}
                exhaustionPoint={exhaustionPoint}
                premium={premium}
                onSetCoverageLimit={setCoverageLimit}
                onSetAttachmentPoint={setAttachmentPoint}
                onSetExhaustionPoint={setExhaustionPoint}
                onSetPremium={setPremium}
              />
              {financialsExtensions.length > 0 ? (
                <DynamicFormSection
                  isActive={activeSection === 'financials'}
                  label="AI-suggested fields"
                  fields={financialsExtensions}
                  badge="ai"
                  inline
                />
              ) : null}

              <SubjectInsuranceSection
                isActive={activeSection === 'subjects'}
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
              />

              <TrancheStructureSection
                isActive={activeSection === 'tranches'}
                tranches={tranches}
                subjects={subjects}
                groupedSubjects={groupedSubjects}
                subjectGroupingMode={subjectGroupingMode}
                onAddTranche={addTranche}
                onUpdateTrancheSubjectSelectionMode={updateTrancheSubjectSelectionMode}
                onUpdateTranche={updateTranche}
                onUpdateTrancheSubjectSelection={updateTrancheSubjectSelection}
              />

              <ValidationSection
                isActive={activeSection === 'validation'}
                exposureLoading={exposureLoading}
                liveExposureDisplay={fmtCurrency(liveExposureValue)}
                sourceLabel={sourceSubmission ? `Seeded from ${sourceSubmission.submissionNumber}` : 'Manual draft'}
                subjectCount={subjects.length}
                trancheCount={tranches.length}
                sourceTypeLabel={sourceSubmission ? sourceSubmission.lineOfBusiness : 'Draft'}
                subjectPreview={subjectPreview || 'No subject labels have been configured yet.'}
                checks={validationChecks}
              />

              <SubmissionSection
                isActive={activeSection === 'submission'}
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

              <SigningSection isActive={activeSection === 'signing'} checks={signingChecks} />

              {aiSections.map((section) => (
                <DynamicFormSection
                  key={section.key}
                  isActive={activeSection === section.key}
                  label={section.label}
                  description={section.description}
                  fields={section.fields}
                  repeatable={section.repeatable}
                  badge="ai"
                />
              ))}
            </S.Form>
          </S.LeftColumn>

          <LiveSummaryAside
            exposureLoading={exposureLoading}
            exposureDisplay={exposure != null ? fmtCurrency(exposure) : '—'}
            subjects={subjects}
            workflowChecks={workflowChecks}
          />
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
