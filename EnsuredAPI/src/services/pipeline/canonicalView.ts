/**
 * The ONE reconciled projection of a submission's cross-cutting facts, derived
 * from the authoritative per-stage blocks already namespaced inside
 * `SubmissionOutput.structuredData` (`classification`, `submissionType`,
 * `assignment`, `insuredSubjects`, `extraction`).
 *
 * Why this exists: the pipeline used to scatter the same facts across the top of
 * `structuredData` as denormalised copies — eight different line-of-business keys
 * (`lineOfBusiness`, `lineOfBusinessCode`, `lineOfBusinessCodes`, `linesOfBusiness`,
 * `lineOfBusinesses`, `multiLineOfBusiness`, `lineOfBusinessSubType`,
 * `lineOfBusinessSubTypeCode`) and several subject-count keys — and they DISAGREED:
 * two of the three LOB arrays silently dropped the primary line, and the subject
 * count had five different readings (extraction=2, insuredSubjects=4, …). No
 * consumer could know which was authoritative.
 *
 * {@link buildCanonicalView} replaces all of that with a single reconciled block:
 * one LOB list that always includes the primary line and carries per-line subject
 * counts, one multi-line flag, and one insured-subject count. It is PURE and
 * defensive — every stage block may be missing or differently shaped — so it can
 * be recomputed after any stage that touches these facts, and always returns a
 * coherent view from whatever blocks exist so far.
 */

export interface CanonicalLineOfBusinessEntry {
  code: string;
  label: string | null;
  subjectCount: number;
}

export interface CanonicalLineOfBusiness {
  primaryCode: string | null;
  primaryLabel: string | null;
  subTypeCode: string | null;
  subTypeLabel: string | null;
  /** True when the submission spans more than one line of business. */
  multi: boolean;
  /** Every distinct line, primary first, deduped by code, with subject counts. */
  all: CanonicalLineOfBusinessEntry[];
}

export interface CanonicalSubmissionType {
  code: string | null;
  label: string | null;
  subTypeCode: string | null;
  subTypeLabel: string | null;
}

export interface CanonicalAssignment {
  userId: number | null;
  departmentId: number | null;
  teamId: number | null;
}

export interface CanonicalView {
  lineOfBusiness: CanonicalLineOfBusiness;
  submissionType: CanonicalSubmissionType;
  assignment: CanonicalAssignment;
  /** The single authoritative count of insured subjects across the submission. */
  insuredSubjectCount: number | null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function asInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function asCount(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

/**
 * Reconcile the line-of-business facts from the classification stage (the
 * headline + its early multi-line list) with the insuredSubject stage (the
 * authoritative per-subject breakdown, which carries the counts). Dedupes by
 * code, prefers a real label over none, attaches subject counts where known, and
 * GUARANTEES the primary line is present even when an upstream list omitted it.
 */
function reconcileLineOfBusiness(sd: Record<string, unknown>): CanonicalLineOfBusiness {
  const classification = toRecord(sd.classification);
  const insuredSubjects = toRecord(sd.insuredSubjects);

  const primaryCode = asString(classification.lineOfBusinessCode);
  const primaryLabel = asString(classification.lineOfBusinessLabel);

  // code -> entry, insertion-ordered with the primary first.
  const byCode = new Map<string, CanonicalLineOfBusinessEntry>();
  const add = (codeRaw: unknown, labelRaw: unknown, count: number): void => {
    const code = asString(codeRaw);
    if (!code) return;
    const key = code.toLowerCase();
    const existing = byCode.get(key);
    if (existing) {
      if (!existing.label) existing.label = asString(labelRaw);
      if (count > existing.subjectCount) existing.subjectCount = count;
    } else {
      byCode.set(key, { code, label: asString(labelRaw), subjectCount: count });
    }
  };

  // Primary first, so it always leads the list and can never be dropped.
  if (primaryCode) add(primaryCode, primaryLabel, 0);

  // The insuredSubject stage's per-line breakdown is the source of subject counts.
  const lines = Array.isArray(insuredSubjects.linesOfBusiness) ? insuredSubjects.linesOfBusiness : [];
  for (const entry of lines) {
    const r = toRecord(entry);
    add(r.code, r.label, asCount(r.subjectCount) ?? 0);
  }

  // The classification stage's early multi-line list (codes/labels, no counts).
  const classified = Array.isArray(classification.lineOfBusinesses) ? classification.lineOfBusinesses : [];
  for (const entry of classified) {
    const r = toRecord(entry);
    add(r.lineOfBusinessCode, r.lineOfBusinessLabel, 0);
  }

  const all = Array.from(byCode.values());
  const multi = all.length > 1 || classification.multiLineOfBusiness === true;

  return {
    primaryCode,
    primaryLabel,
    subTypeCode: asString(classification.lineOfBusinessSubTypeCode),
    subTypeLabel: asString(classification.lineOfBusinessSubTypeLabel),
    multi,
    all,
  };
}

/**
 * Build the single canonical view from whatever stage blocks exist on
 * `structuredData` so far. Safe to call after any stage; absent blocks simply
 * yield null/empty fields rather than throwing.
 */
export function buildCanonicalView(structuredData: unknown): CanonicalView {
  const sd = toRecord(structuredData);
  const submissionType = toRecord(sd.submissionType);
  const assignment = toRecord(sd.assignment);
  const insuredSubjects = toRecord(sd.insuredSubjects);
  const extraction = toRecord(sd.extraction);

  const lineOfBusiness = reconcileLineOfBusiness(sd);

  // One authoritative subject count: prefer the insuredSubject stage's own count,
  // then the sum of per-line counts, then extraction's earlier subject count.
  const perLineSum = lineOfBusiness.all.reduce((acc, l) => acc + l.subjectCount, 0);
  const insuredSubjectCount =
    asCount(insuredSubjects.subjectCount) ??
    (perLineSum > 0 ? perLineSum : null) ??
    asCount(extraction.subjectCount);

  return {
    lineOfBusiness,
    submissionType: {
      code: asString(submissionType.submissionTypeCode),
      label: asString(submissionType.submissionTypeLabel),
      subTypeCode: asString(submissionType.submissionSubTypeCode),
      subTypeLabel: asString(submissionType.submissionSubTypeLabel),
    },
    assignment: {
      userId: asInt(assignment.assignedUserId),
      departmentId: asInt(assignment.assignedDepartmentId),
      teamId: asInt(assignment.assignedTeamId),
    },
    insuredSubjectCount,
  };
}
