import { InsurerProfile, Organization, Submission, User } from '../../../db/models';

export type OrganizationStatus = 'active' | 'inactive';

export type CanonicalFilterSubject = {
  index: number;
  lineOfBusinessCode: string | null;
  lineOfBusinessSubTypeCode: string | null;
  perilCodes: string[];
  geographyEntries: string[];
  tiv: number | null;
  limit: number | null;
  attachment: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type CanonicalFilterIndex = {
  submissionId: number;
  status: string | null;
  submissionTypeCode: string | null;
  submissionTypeLabel: string | null;
  brokerOrganizationId: number | null;
  brokerOrganizationName: string | null;
  brokerOrganizationStatus: OrganizationStatus | null;
  carrierOrganizationId: number | null;
  carrierOrganizationName: string | null;
  carrierOrganizationStatus: OrganizationStatus | null;
  lineOfBusinessCodes: string[];
  lineOfBusinessSubTypeCodes: string[];
  subjectPerilCodes: string[];
  geographyEntries: string[];
  subjectTivMin: number | null;
  subjectTivMax: number | null;
  subjectLimitMin: number | null;
  subjectLimitMax: number | null;
  subjectAttachmentMin: number | null;
  subjectAttachmentMax: number | null;
  subjects: CanonicalFilterSubject[];
};

type SubmissionWithFilterRelations = Submission & {
  submittedBy?: (User & { organization?: (Organization & { users?: User[] }) | null }) | null;
  insurerProfile?: (InsurerProfile & { organization?: (Organization & { users?: User[] }) | null }) | null;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCode(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || null;
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = stringValue(value);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function compactNumberRange(values: Array<number | null>): { min: number | null; max: number | null } {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finite.length === 0) return { min: null, max: null };
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

function organizationStatus(organization: (Organization & { users?: User[] }) | null | undefined): OrganizationStatus {
  const users = organization?.users ?? [];
  return users.some((user) => user.isActive !== false) ? 'active' : 'inactive';
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    const result = stringValue(value);
    if (result) return result;
  }
  return null;
}

function pickFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const result = numberValue(value);
    if (result !== null) return result;
  }
  return null;
}

function subjectRows(data: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [
    toRecord(data.insuredSubjects).subjects,
    toRecord(data.locationDiscovery).subjects,
    data.subjects,
    toRecord(data.extraction).subjects,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map(toRecord);
    }
  }
  return [];
}

function perilCodesForSubject(subject: Record<string, unknown>, data: Record<string, unknown>): string[] {
  const attrs = toRecord(subject.attributes);
  const rawCandidates = [
    subject.perilCodes,
    attrs.perilCodes,
    attrs.perils,
    attrs.risk_type,
    subject.riskType,
    data.subjectPerils,
    data.riskType,
    data.perilType,
  ];
  const codes: string[] = [];
  for (const raw of rawCandidates) {
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    for (const value of values) {
      const code = normalizeCode(value);
      if (code) codes.push(code);
    }
  }
  return uniqueStrings(codes);
}

function geographyForSubject(subject: Record<string, unknown>, data: Record<string, unknown>): string[] {
  const attrs = toRecord(subject.attributes);
  return uniqueStrings([
    subject.address as string | null,
    subject.location as string | null,
    subject.locationText as string | null,
    subject.propertyLocation as string | null,
    attrs.address as string | null,
    attrs.location as string | null,
    attrs.location_text as string | null,
    attrs.city as string | null,
    attrs.state as string | null,
    attrs.country as string | null,
    data.propertyLocation as string | null,
    data.locationText as string | null,
  ]);
}

function buildSubject(index: number, subject: Record<string, unknown>, data: Record<string, unknown>): CanonicalFilterSubject {
  const attrs = toRecord(subject.attributes);
  const canonical = toRecord(data.canonical);
  const canonicalLob = toRecord(canonical.lineOfBusiness);

  return {
    index,
    lineOfBusinessCode: pickFirstString(subject.lineOfBusinessCode, attrs.line_of_business_code, data.lineOfBusinessCode, canonicalLob.primaryCode),
    lineOfBusinessSubTypeCode: pickFirstString(
      subject.lineOfBusinessSubTypeCode,
      attrs.line_of_business_sub_type_code,
      data.lineOfBusinessSubTypeCode,
      canonicalLob.subTypeCode,
    ),
    perilCodes: perilCodesForSubject(subject, data),
    geographyEntries: geographyForSubject(subject, data),
    tiv: pickFirstNumber(
      subject.tiv,
      subject.totalInsuredValue,
      attrs.tiv,
      attrs.total_insured_value,
      attrs.sov_insured_value,
      subject.replacementCost,
      attrs.replacement_cost,
    ),
    limit: pickFirstNumber(subject.limit, subject.coverageLimit, attrs.limit, attrs.coverage_limit, data.limit),
    attachment: pickFirstNumber(subject.attachment, subject.attachmentPoint, attrs.attachment, attrs.attachment_point, data.attachmentPoint),
    latitude: pickFirstNumber(subject.latitude, attrs.latitude),
    longitude: pickFirstNumber(subject.longitude, attrs.longitude),
  };
}

async function loadSubmission(submissionId: number): Promise<SubmissionWithFilterRelations | null> {
  const submissionModel = Submission as unknown as { findByPk?: Function };
  if (!submissionModel?.findByPk) return null;

  return submissionModel.findByPk(submissionId, {
    include: [
      {
        model: User,
        as: 'submittedBy',
        include: [{ model: Organization, as: 'organization', include: [{ model: User, as: 'users' }] }],
      },
      {
        model: InsurerProfile,
        as: 'insurerProfile',
        include: [{ model: Organization, as: 'organization', include: [{ model: User, as: 'users' }] }],
      },
    ],
  });
}

export async function buildCanonicalFilterIndex(params: {
  submissionId: number;
  data: Record<string, unknown>;
  submission?: SubmissionWithFilterRelations | null;
}): Promise<CanonicalFilterIndex> {
  const submission = params.submission ?? (await loadSubmission(params.submissionId).catch(() => null));
  const data = params.data ?? {};
  const rows = subjectRows(data);
  const subjects = (rows.length > 0 ? rows : [data]).map((row, index) => buildSubject(index, row, data));
  const canonical = toRecord(data.canonical);
  const canonicalType = toRecord(canonical.submissionType);
  const submissionType = toRecord(data.submissionType);
  const brokerOrg = submission?.submittedBy?.organization ?? null;
  const carrierOrg = submission?.insurerProfile?.organization ?? null;
  const tivRange = compactNumberRange(subjects.map((subject) => subject.tiv));
  const limitRange = compactNumberRange(subjects.map((subject) => subject.limit));
  const attachmentRange = compactNumberRange(subjects.map((subject) => subject.attachment));

  return {
    submissionId: params.submissionId,
    status: stringValue(submission?.status ?? data.status),
    submissionTypeCode: pickFirstString(data.submissionTypeCode, submissionType.submissionTypeCode, canonicalType.code),
    submissionTypeLabel: pickFirstString(data.submissionTypeLabel, submissionType.submissionTypeLabel, canonicalType.label),
    brokerOrganizationId: brokerOrg?.id ?? null,
    brokerOrganizationName: brokerOrg?.name ?? null,
    brokerOrganizationStatus: brokerOrg ? organizationStatus(brokerOrg) : null,
    carrierOrganizationId: carrierOrg?.id ?? null,
    carrierOrganizationName: carrierOrg?.name ?? null,
    carrierOrganizationStatus: carrierOrg ? organizationStatus(carrierOrg) : null,
    lineOfBusinessCodes: uniqueStrings(subjects.map((subject) => subject.lineOfBusinessCode)),
    lineOfBusinessSubTypeCodes: uniqueStrings(subjects.map((subject) => subject.lineOfBusinessSubTypeCode)),
    subjectPerilCodes: uniqueStrings(subjects.flatMap((subject) => subject.perilCodes)),
    geographyEntries: uniqueStrings(subjects.flatMap((subject) => subject.geographyEntries)),
    subjectTivMin: tivRange.min,
    subjectTivMax: tivRange.max,
    subjectLimitMin: limitRange.min,
    subjectLimitMax: limitRange.max,
    subjectAttachmentMin: attachmentRange.min,
    subjectAttachmentMax: attachmentRange.max,
    subjects,
  };
}
