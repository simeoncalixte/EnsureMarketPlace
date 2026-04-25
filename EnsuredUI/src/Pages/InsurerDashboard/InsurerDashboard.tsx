import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import getApiBase from '../../lib/api';
import * as S from './InsurerDashboard.styles';
import Input from '../../xds/components/Input';
import NumberInput from '../../xds/components/NumberInput';
import Select from '../../xds/components/Select';
import Button from '../../xds/components/Button';
import SubNavigation from '../../xds/components/SubNavigation';

type TrancheInput = {
  name: string;
  layerMin: string;
  layerMax: string;
  returnRate: string;
  riskLevel: string;
  capitalRequired: string;
};

type SubjectInput = {
  subjectLabel: string;
  lineOfBusiness: string;
  lineOfBusinessSubType: string;
  locationText: string;
  assetType: string;
  constructionType: string;
  occupancyType: string;
  replacementCost: string;
  latitude: string;
  longitude: string;
  vulnerabilityScore: string;
};

const assetTypeOptions = ['building', 'contents', 'vehicle', 'business_interruption'] as const;
const constructionTypeOptions = ['wood', 'masonry', 'steel', 'concrete'] as const;
const occupancyTypeOptions = ['residential', 'commercial', 'industrial', 'mixed'] as const;

type CreateDealSectionId = 'deal' | 'financials' | 'subjects' | 'tranches' | 'risk';

const createDealSectionTabs: Array<{ id: CreateDealSectionId; label: string }> = [
  { id: 'deal', label: 'Deal Parameters' },
  { id: 'financials', label: 'Financials' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'tranches', label: 'Tranche Structure' },
  { id: 'risk', label: 'Risk Modeling' },
];

type DealSubmissionSeed = {
  submissionId: number;
  submissionNumber: string;
  cedent: string;
  lineOfBusiness: string;
  locationText?: string;
  region: string;
  premium: number;
  exposure: number;
  receivedLabel: string;
  owner: string;
  source: string;
  notes: string;
};

type CreateDealLocationState = {
  sourceSubmission?: DealSubmissionSeed;
};

type LineOfBusinessTaxonomySubType = {
  code: string;
  label: string;
};

type LineOfBusinessTaxonomyPrimary = {
  code: string;
  label: string;
  subTypes: LineOfBusinessTaxonomySubType[];
};

type LineOfBusinessTaxonomyResponse = {
  primaryTypes: LineOfBusinessTaxonomyPrimary[];
};

function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : '';
}

function inferPeril(lineOfBusiness: string): string {
  const normalized = lineOfBusiness.toLowerCase();

  if (normalized.includes('marine')) {
    return 'FLOOD';
  }

  if (normalized.includes('cyber') || normalized.includes('trade credit') || normalized.includes('liability')) {
    return 'EQ';
  }

  return 'US WIND';
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLineOfBusinessKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const legacyLineOfBusinessAliases: Array<{ pattern: RegExp; primary: string; subType?: string }> = [
  { pattern: /property\s*cat/i, primary: 'Property', subType: 'Catastrophe' },
  { pattern: /marine\s*cargo/i, primary: 'Ocean Marine', subType: 'Cargo' },
  { pattern: /trade\s*credit/i, primary: 'Trade Credit', subType: 'Whole Turnover' },
  { pattern: /energy\s*liability/i, primary: 'Energy Liability', subType: 'Operators Liability' },
  { pattern: /construction\s*all\s*risk/i, primary: 'Construction All Risk', subType: 'Civil Works' },
  { pattern: /cyber/i, primary: 'Cyber', subType: 'Network Security' },
  { pattern: /public\s*entity/i, primary: 'Public Entity', subType: 'Municipal Property' },
  { pattern: /professional\s*liability/i, primary: 'Professional Liability', subType: 'Consultants' },
  { pattern: /property/i, primary: 'Property', subType: 'All Risk' },
  { pattern: /marine/i, primary: 'Ocean Marine', subType: 'Cargo' },
];

function resolveLineOfBusinessSelection(
  lineOfBusiness: string,
  taxonomy: LineOfBusinessTaxonomyPrimary[],
): { primary: string; subType: string } {
  const raw = lineOfBusiness.trim();
  if (!raw || taxonomy.length === 0) {
    return { primary: '', subType: '' };
  }

  const normalized = normalizeLineOfBusinessKey(raw);

  for (const primary of taxonomy) {
    if (normalizeLineOfBusinessKey(primary.label) === normalized || normalizeLineOfBusinessKey(primary.code) === normalized) {
      return {
        primary: primary.label,
        subType: primary.subTypes[0]?.label ?? '',
      };
    }

    const matchedSubType = primary.subTypes.find((subType) => normalizeLineOfBusinessKey(subType.label) === normalized || normalizeLineOfBusinessKey(subType.code) === normalized);
    if (matchedSubType) {
      return {
        primary: primary.label,
        subType: matchedSubType.label,
      };
    }
  }

  for (const alias of legacyLineOfBusinessAliases) {
    if (alias.pattern.test(raw)) {
      const matchedPrimary = taxonomy.find((primary) => normalizeLineOfBusinessKey(primary.label) === normalizeLineOfBusinessKey(alias.primary));
      const resolvedPrimary = matchedPrimary?.label ?? alias.primary;
      const resolvedSubType = alias.subType
        ? matchedPrimary?.subTypes.find((subType) => normalizeLineOfBusinessKey(subType.label) === normalizeLineOfBusinessKey(alias.subType ?? ''))?.label ?? alias.subType
        : matchedPrimary?.subTypes[0]?.label ?? '';

      return {
        primary: resolvedPrimary,
        subType: resolvedSubType,
      };
    }
  }

  return { primary: '', subType: '' };
}

function createSubjectDraft(
  index: number,
  sourceSubmission: DealSubmissionSeed | null,
  taxonomy: LineOfBusinessTaxonomyPrimary[] = [],
): SubjectInput {
  const labelPrefix = sourceSubmission?.cedent ? `${sourceSubmission.cedent} Subject` : 'Subject';
  const selection = sourceSubmission ? resolveLineOfBusinessSelection(sourceSubmission.lineOfBusiness, taxonomy) : { primary: '', subType: '' };

  return {
    subjectLabel: `${labelPrefix} ${index + 1}`,
    lineOfBusiness: selection.primary,
    lineOfBusinessSubType: selection.subType,
    locationText: sourceSubmission?.locationText ?? sourceSubmission?.region ?? '',
    assetType: 'building',
    constructionType: 'masonry',
    occupancyType: 'commercial',
    replacementCost: formatNumberInput(sourceSubmission?.exposure ?? 250000000),
    latitude: '',
    longitude: '',
    vulnerabilityScore: '0.5000',
  };
}

function buildDefaultSubjects(
  sourceSubmission: DealSubmissionSeed | null,
  taxonomy: LineOfBusinessTaxonomyPrimary[] = [],
): SubjectInput[] {
  return [createSubjectDraft(0, sourceSubmission, taxonomy)];
}

function normalizeSubject(subject: SubjectInput, index: number) {
  return {
    subjectLabel: subject.subjectLabel.trim() || `Subject ${index + 1}`,
    subjectIndex: index + 1,
    lineOfBusiness: toOptionalText(subject.lineOfBusiness),
    lineOfBusinessSubType: toOptionalText(subject.lineOfBusinessSubType),
    locationText: toOptionalText(subject.locationText),
    assetType: subject.assetType,
    constructionType: subject.constructionType || null,
    occupancyType: subject.occupancyType || null,
    replacementCost: toNumberOrNull(subject.replacementCost),
    latitude: toNumberOrNull(subject.latitude),
    longitude: toNumberOrNull(subject.longitude),
    vulnerabilityScore: toNumberOrNull(subject.vulnerabilityScore),
  };
}

function buildDefaultTranches(exposure: number): TrancheInput[] {
  const baseExposure = exposure > 0 ? exposure : 950000000;

  return [
    {
      name: 'Senior Capital',
      layerMin: formatNumberInput(baseExposure * 0.5),
      layerMax: formatNumberInput(baseExposure * 1.2),
      returnRate: '0',
      riskLevel: 'low',
      capitalRequired: formatNumberInput(baseExposure * 0.7),
    },
    {
      name: 'Mezzanine',
      layerMin: formatNumberInput(baseExposure * 0.25),
      layerMax: formatNumberInput(baseExposure * 0.5),
      returnRate: '0',
      riskLevel: 'medium',
      capitalRequired: formatNumberInput(baseExposure * 0.25),
    },
  ];
}

export default function InsurerDashboard() {
  const location = useLocation();
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
  const [activeSection, setActiveSection] = useState<CreateDealSectionId>('deal');

  const [tranches, setTranches] = useState<TrancheInput[]>(() => buildDefaultTranches(sourceSubmission?.exposure ?? 950000000));

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exposure, setExposure] = useState<number | null>(null);
  const [exposureLoading, setExposureLoading] = useState(false);

  const addTranche = () =>
    setTranches((s) => [...s, { name: 'New Tranche', layerMin: '', layerMax: '', returnRate: '', riskLevel: 'medium', capitalRequired: '' }]);
  const removeTranche = (idx: number) => setTranches((s) => s.filter((_, i) => i !== idx));
  const updateTranche = (idx: number, key: keyof TrancheInput, value: string) =>
    setTranches((s) => s.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  const addSubject = () => setSubjects((s) => [...s, createSubjectDraft(s.length, sourceSubmission, lineOfBusinessTaxonomy)]);
  const removeSubject = (idx: number) => setSubjects((s) => (s.length > 1 ? s.filter((_, i) => i !== idx) : s));
  const updateSubject = (idx: number, key: keyof SubjectInput, value: string) =>
    setSubjects((s) => s.map((subject, i) => (i === idx ? { ...subject, [key]: value } : subject)));
  const updateSubjectPrimaryLineOfBusiness = (idx: number, value: string) =>
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
        };
      }),
    );

  useEffect(() => {
    let active = true;

    const fetchLineOfBusinessTaxonomy = async () => {
      try {
        const base = getApiBase();
        const endpoint = base ? `${base}/api/marketplace/line-of-business-taxonomy` : '/api/marketplace/line-of-business-taxonomy';
        const res = await fetch(endpoint);
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as LineOfBusinessTaxonomyResponse;
        if (!active) {
          return;
        }

        setLineOfBusinessTaxonomy(Array.isArray(data?.primaryTypes) ? data.primaryTypes : []);
      } catch (err) {
        if (!active) {
          return;
        }

        setLineOfBusinessTaxonomy([]);
      }
    };

    fetchLineOfBusinessTaxonomy();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sourceSubmission || lineOfBusinessTaxonomy.length === 0) {
      return;
    }

    const selection = resolveLineOfBusinessSelection(sourceSubmission.lineOfBusiness, lineOfBusinessTaxonomy);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const subjectsPayload = subjects.map((subject, index) => normalizeSubject(subject, index));
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
          name: t.name,
          layerMin: Number(t.layerMin),
          layerMax: Number(t.layerMax),
          returnRate: Number(t.returnRate) || 0,
          riskLevel: t.riskLevel,
          capitalRequired: t.capitalRequired ? Number(t.capitalRequired) : undefined,
        })),
      };

      const base = getApiBase();
      const endpoint = base ? `${base}/api/marketplace/deals` : '/api/marketplace/deals';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
  };

  const fetchExposure = async () => {
    try {
      setExposureLoading(true);
      const base = getApiBase();
      const endpoint = base ? `${base}/api/marketplace/summary/capital-exposure` : '/api/marketplace/summary/capital-exposure';
      const res = await fetch(endpoint);
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

  return (
    <>
      <S.ContentArea>
          <S.LeftColumn>
            {sourceSubmission ? (
              <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: '1px solid rgba(75,142,255,0.18)', borderLeft: '4px solid #4b8eff', background: '#0f1724' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Preloaded submission</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>{sourceSubmission.submissionNumber}</div>
                <div style={{ marginTop: 4, color: '#dae2fd' }}>{sourceSubmission.cedent}</div>
                <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                  Line of Business {sourceSubmission.lineOfBusiness} • Location {sourceSubmission.locationText ?? sourceSubmission.region}
                </div>
                <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12 }}>
                  Region {sourceSubmission.region} • Owner {sourceSubmission.owner}
                </div>
                <div style={{ marginTop: 8, color: '#c1c6d7', fontSize: 12 }}>{sourceSubmission.notes}</div>
                <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
                  Premium {fmtCurrency(sourceSubmission.premium)} • Exposure {fmtCurrency(sourceSubmission.exposure)} • Subjects {subjects.length} • Received {sourceSubmission.receivedLabel}
                </div>
              </div>
            ) : null}
            <div style={{ marginBottom: 20 }}>
              <SubNavigation
                tabs={createDealSectionTabs}
                activeId={activeSection}
                onChange={(id) => setActiveSection(id as CreateDealSectionId)}
              />
            </div>
            <S.Form onSubmit={handleSubmit}>
              <S.Section style={{ display: activeSection === 'deal' ? 'block' : 'none' }}>
                <S.SectionHeader>
                  <S.SectionTitle>01 Deal Parameters</S.SectionTitle>
                  <S.SectionRule />
                </S.SectionHeader>
                <S.GridTwo>
                  <div>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Deal Name / ID</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Ceding Entity</label>
                    <Select value={cedingEntity} onChange={(e) => setCedingEntity(e.target.value)}>
                      {sourceSubmission ? <option value={sourceSubmission.cedent}>{sourceSubmission.cedent}</option> : null}
                      <option>Munich Re Institutional</option>
                      <option>Swiss Re Capital</option>
                      <option>Lloyd's Syndicate 1910</option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Effective Dates</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <div style={{ alignSelf: 'center', color: 'rgba(148,163,184,0.6)' }}>to</div>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Peril Type</label>
                    <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                      <S.PerilButton type="button" data-active={peril === 'US WIND'} onClick={() => setPeril('US WIND')}>US WIND</S.PerilButton>
                      <S.PerilButton type="button" data-active={peril === 'FLOOD'} onClick={() => setPeril('FLOOD')}>FLOOD</S.PerilButton>
                      <S.PerilButton type="button" data-active={peril === 'EQ'} onClick={() => setPeril('EQ')}>EQ</S.PerilButton>
                    </div>
                  </div>
                </S.GridTwo>
              </S.Section>

              <S.Section style={{ display: activeSection === 'financials' ? 'block' : 'none' }}>
                <S.SectionHeader>
                  <S.SectionTitle>01b Financials</S.SectionTitle>
                  <S.SectionRule />
                </S.SectionHeader>
                <S.GridTwo>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Coverage Limit</label>
                    <NumberInput value={coverageLimit} onChange={(e) => setCoverageLimit(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Attachment Point (Deductible)</label>
                    <NumberInput value={attachmentPoint} onChange={(e) => setAttachmentPoint(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Exhaustion Point</label>
                    <NumberInput value={exhaustionPoint} onChange={(e) => setExhaustionPoint(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', fontWeight: 700 }}>Premium</label>
                    <NumberInput value={premium} onChange={(e) => setPremium(e.target.value)} />
                  </div>
                </S.GridTwo>
              </S.Section>

              <S.Section style={{ display: activeSection === 'subjects' ? 'block' : 'none' }}>
                <S.SectionHeader>
                  <S.SectionTitle>02 Subject of Insurance</S.SectionTitle>
                  <S.SectionRule />
                  <div style={{ marginLeft: 'auto' }}>
                    <Button type="button" onClick={addSubject}>+ Add Subject</Button>
                  </div>
                </S.SectionHeader>
                <div style={{ marginBottom: 12, color: '#94a3b8', fontSize: 12 }}>
                  Track each insured object separately so the deal can carry multiple subjects of insurance.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {subjects.map((subject, idx) => (
                    <S.TrancheCard key={`${subject.subjectLabel}-${idx}`} data-kind="subject" data-primary={idx === 0}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Subject {idx + 1}</label>
                          <div style={{ fontWeight: 800 }}>{subject.subjectLabel || `Subject ${idx + 1}`}</div>
                        </div>
                        <Button type="button" onClick={() => removeSubject(idx)}>Remove</Button>
                      </div>
                      <S.TrancheGrid>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Subject Label</label>
                          <Input value={subject.subjectLabel} onChange={(e) => updateSubject(idx, 'subjectLabel', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Line of Business</label>
                          <Select value={subject.lineOfBusiness} onChange={(e) => updateSubjectPrimaryLineOfBusiness(idx, e.target.value)}>
                            <option value="">Select primary line of business</option>
                            {lineOfBusinessTaxonomy.map((option) => (
                              <option key={option.code} value={option.label}>{option.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Subtype</label>
                          <Select
                            value={subject.lineOfBusinessSubType}
                            onChange={(e) => updateSubject(idx, 'lineOfBusinessSubType', e.target.value)}
                            disabled={!subject.lineOfBusiness}
                          >
                            <option value="">Select subtype</option>
                            {(lineOfBusinessTaxonomy.find((option) => option.label === subject.lineOfBusiness)?.subTypes ?? []).map((subType) => (
                              <option key={subType.code} value={subType.label}>{subType.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Location (Text)</label>
                          <Input value={subject.locationText} onChange={(e) => updateSubject(idx, 'locationText', e.target.value)} placeholder="123 Main St, Houston, TX" />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Asset Type</label>
                          <Select value={subject.assetType} onChange={(e) => updateSubject(idx, 'assetType', e.target.value)}>
                            {assetTypeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Construction Type</label>
                          <Select value={subject.constructionType} onChange={(e) => updateSubject(idx, 'constructionType', e.target.value)}>
                            {constructionTypeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Occupancy Type</label>
                          <Select value={subject.occupancyType} onChange={(e) => updateSubject(idx, 'occupancyType', e.target.value)}>
                            {occupancyTypeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Replacement Cost</label>
                          <NumberInput style={{ width: '100%' }} value={subject.replacementCost} onChange={(e) => updateSubject(idx, 'replacementCost', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Latitude</label>
                          <NumberInput style={{ width: '100%' }} value={subject.latitude} onChange={(e) => updateSubject(idx, 'latitude', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Longitude</label>
                          <NumberInput style={{ width: '100%' }} value={subject.longitude} onChange={(e) => updateSubject(idx, 'longitude', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Vulnerability Score</label>
                          <NumberInput style={{ width: '100%' }} value={subject.vulnerabilityScore} onChange={(e) => updateSubject(idx, 'vulnerabilityScore', e.target.value)} />
                        </div>
                      </S.TrancheGrid>
                    </S.TrancheCard>
                  ))}
                </div>
              </S.Section>

              <S.Section style={{ display: activeSection === 'tranches' ? 'block' : 'none' }}>
                <S.SectionHeader>
                  <S.SectionTitle>03 Tranche Structure</S.SectionTitle>
                  <S.SectionRule />
                  <div style={{ marginLeft: 'auto' }}>
                    <Button type="button" onClick={addTranche}>+ Add Tranche</Button>
                  </div>
                </S.SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tranches.map((t, idx) => (
                    <S.TrancheCard key={idx} data-primary={idx === 0}>
                      <S.TrancheGrid>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Layer Type</label>
                          <div style={{ fontWeight: 800 }}>{t.name}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Attachment</label>
                          <NumberInput value={t.layerMin} onChange={(e) => updateTranche(idx, 'layerMin', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Exhaustion</label>
                          <NumberInput value={t.layerMax} onChange={(e) => updateTranche(idx, 'layerMax', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Capacity</label>
                          <NumberInput value={t.capitalRequired} onChange={(e) => updateTranche(idx, 'capitalRequired', e.target.value)} />
                        </div>
                      </S.TrancheGrid>
                    </S.TrancheCard>
                  ))}
                </div>
              </S.Section>

              <S.Section style={{ display: activeSection === 'risk' ? 'block' : 'none' }}>
                <S.SectionHeader>
                  <S.SectionTitle>04 Risk Modeling</S.SectionTitle>
                  <S.SectionRule />
                </S.SectionHeader>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ border: '2px dashed rgba(65,71,85,0.12)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                    <S.Icon className="material-symbols-outlined" style={{ fontSize: 32, color: '#4b8eff' }}>cloud_upload</S.Icon>
                    <div style={{ fontWeight: 700, marginTop: 8 }}>Drop CAT Model Exports</div>
                    <div style={{ fontSize: 10, marginTop: 6, color: '#94a3b8' }}>AIR (v.7.x) or RMS (RiskLink) .CSV or .JSON</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#0f1724', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ background: 'rgba(75,142,255,0.08)', padding: 8, borderRadius: 6 }}><S.Icon className="material-symbols-outlined">insert_chart</S.Icon></div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>AIR_Model_Output_9902.csv</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>1.2 MB • Ready</div>
                        </div>
                      </div>
                      <S.Icon className="material-symbols-outlined" style={{ color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>check_circle</S.Icon>
                    </div>
                    <div style={{ background: '#0f1724', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ background: 'rgba(75,142,255,0.08)', padding: 8, borderRadius: 6 }}><S.Icon className="material-symbols-outlined">description</S.Icon></div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>Historical_Loss_Data_v2.xlsx</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>456 KB • Ready</div>
                        </div>
                      </div>
                      <S.Icon className="material-symbols-outlined" style={{ color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>check_circle</S.Icon>
                    </div>
                  </div>
                </div>
              </S.Section>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#94a3b8' }}>Platform will auto-create an SPV for this deal when needed; you don't need to supply an SPV ID.</div>
                <div>
                  <Button type="submit">{loading ? 'Submitting…' : 'Validate & Submit Deal'}</Button>
                </div>
              </div>
              {message && <div style={{ marginTop: 12 }}>{message}</div>}
            </S.Form>
          </S.LeftColumn>

          <S.RightAside>
            <S.SummaryCard>
              <S.SummaryInner>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>Live Capital Exposure</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Total Capacity</div>
                    <div style={{ fontSize: 12, color: '#4edea3', fontWeight: 700 }}>+8.4% WoW</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>
                    {exposureLoading ? 'Loading…' : exposure != null ? fmtCurrency(exposure) : '—'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ color: '#94a3b8' }}>Subjects tracked</div>
                    <div style={{ color: '#4edea3', fontWeight: 700 }}>{subjects.length}</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: '#c1c6d7', lineHeight: 1.4 }}>
                    {subjects.slice(0, 2).map((subject) => subject.subjectLabel).join(' • ')}{subjects.length > 2 ? ` • +${subjects.length - 2} more` : ''}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#0f1724', padding: 12, borderRadius: 8, borderLeft: '4px solid #4b8eff' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Wtd. Avg Return</div>
                    <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#4b8eff' }}>12.45%</div>
                  </div>
                  <div style={{ background: '#0f1724', padding: 12, borderRadius: 8, borderLeft: '4px solid #ff5451' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Expected Loss</div>
                    <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#ffb3ad' }}>3.12%</div>
                  </div>
                </div>
              </S.SummaryInner>
              <div style={{ padding: 16 }}>
                <div style={{ height: 128, display: 'flex', gap: 4, alignItems: 'end' }}>
                  <div style={{ flex: 1, background: 'rgba(75,142,255,0.12)', height: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <div style={{ flex: 1, background: 'rgba(75,142,255,0.18)', height: 32, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <div style={{ flex: 1, background: 'rgba(75,142,255,0.28)', height: 56, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <div style={{ flex: 1, background: 'rgba(75,142,255,0.45)', height: 80, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <div style={{ flex: 1, background: 'rgba(75,142,255,0.65)', height: 96, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <div style={{ flex: 1, background: '#4edea3', height: 48, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                    <div style={{ color: '#94a3b8' }}>Validation Status</div>
                    <div style={{ color: '#00a572' }}>ALL PARAMETERS VALID</div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button style={{ width: '100%' }}>VALIDATE &amp; SUBMIT DEAL</Button>
                    <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>By submitting, you confirm the TRX-9902 structural integrity matches the attached prospectus.</div>
                  </div>
                </div>
              </div>
            </S.SummaryCard>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#94a3b8' }}>
                <div style={{ width: 40, height: 40, background: '#0f1724', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <S.Icon className="material-symbols-outlined">history</S.Icon>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Last Modified</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>Today at 14:24:02 GMT</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#94a3b8', marginTop: 12 }}>
                <div style={{ width: 40, height: 40, background: '#0f1724', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <S.Icon className="material-symbols-outlined">share</S.Icon>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Collaboration</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>3 Underwriters Active</div>
                </div>
              </div>
            </div>
          </S.RightAside>
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
