import { Op } from 'sequelize';
import { CatAssessment, CatScore, Peril } from '../../db/models';
import type { catScoreDirections } from '../../db/models/catRisk.models';

/**
 * CAT scores service.
 *
 * Responsibilities:
 * - Parse and apply CAT filters used by marketplace opportunities.
 * - Resolve CAT option lists for filter dropdowns.
 * - Persist/list CAT assessments for a submission.
 * - Enforce CAT peril integrity (canonical + active + catastrophe).
 */

type Direction = (typeof catScoreDirections)[number];

export type MarketplaceCatScoreFilters = {
  perils: Set<string>;
  bands: Set<string>;
  modelVersions: Set<string>;
  recommendedActions: Set<string>;
  minScore: number | null;
  maxScore: number | null;
};

export type CatScoreSnapshot = {
  peril: string;
  scoreValue: number;
  riskBand: string | null;
  modelVersion: string | null;
  recommendedAction: string | null;
};

export type CatScoreOption = { value: string; label: string };

export type CreateCatAssessmentInput = {
  assessmentExternalId?: string;
  subjectType?: string;
  subjectId?: string;
  assessmentDate?: string;
  currency?: string;
  inputExposureSnapshotId?: string;
  scores: Array<{
    peril: string;
    value: number;
    scaleMin?: number;
    scaleMax?: number;
    direction?: Direction;
    band?: string;
    percentile?: number;
    scoreType?: string;
    primaryMetric?: string;
    financialPerspective?: string;
    exposureBasis?: string;
    modelVendor?: string;
    modelName?: string;
    modelVersion?: string;
    eventCatalogVersion?: string;
    runId?: string;
    recommendedAction?: string;
    confidence?: string;
  }>;
};

export class CatScoreValidationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CatScoreValidationError';
    this.statusCode = statusCode;
  }
}

function parseCsvTokens(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => parseCsvTokens(entry));
  }
  if (typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTokenSet(raw: unknown): Set<string> {
  return new Set(parseCsvTokens(raw).map((entry) => entry.toLowerCase()));
}

function parseNumeric(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function normalizeDateOnly(raw: string | undefined): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeDirection(raw: Direction | undefined): Direction {
  if (raw === 'lower_is_riskier') return raw;
  return 'higher_is_riskier';
}

export function parseMarketplaceCatScoreFilters(query: Record<string, unknown>): MarketplaceCatScoreFilters {
  return {
    perils: parseTokenSet(query.catPeril),
    bands: parseTokenSet(query.catBand),
    modelVersions: parseTokenSet(query.catModelVersion),
    recommendedActions: parseTokenSet(query.catRecommendedAction),
    minScore: parseNumeric(query.catScoreMin),
    maxScore: parseNumeric(query.catScoreMax),
  };
}

export function hasActiveMarketplaceCatScoreFilters(filters: MarketplaceCatScoreFilters): boolean {
  return (
    filters.perils.size > 0 ||
    filters.bands.size > 0 ||
    filters.modelVersions.size > 0 ||
    filters.recommendedActions.size > 0 ||
    filters.minScore !== null ||
    filters.maxScore !== null
  );
}

export function matchesMarketplaceCatScoreFilters(
  score: CatScoreSnapshot,
  filters: MarketplaceCatScoreFilters,
): boolean {
  if (filters.perils.size > 0 && !filters.perils.has(score.peril.toLowerCase())) {
    return false;
  }
  if (filters.bands.size > 0) {
    const band = (score.riskBand ?? '').toLowerCase();
    if (!band || !filters.bands.has(band)) {
      return false;
    }
  }
  if (filters.modelVersions.size > 0) {
    const modelVersion = (score.modelVersion ?? '').toLowerCase();
    if (!modelVersion || !filters.modelVersions.has(modelVersion)) {
      return false;
    }
  }
  if (filters.recommendedActions.size > 0) {
    const action = (score.recommendedAction ?? '').toLowerCase();
    if (!action || !filters.recommendedActions.has(action)) {
      return false;
    }
  }
  if (filters.minScore !== null && score.scoreValue < filters.minScore) {
    return false;
  }
  if (filters.maxScore !== null && score.scoreValue > filters.maxScore) {
    return false;
  }
  return true;
}

export async function loadSubmissionCatScoreIndex(submissionIds: number[]): Promise<Map<number, CatScoreSnapshot[]>> {
  const uniqueSubmissionIds = Array.from(new Set(submissionIds.filter((entry) => Number.isFinite(entry))));
  if (uniqueSubmissionIds.length === 0) {
    return new Map();
  }

  const rows = await CatScore.findAll({
    attributes: ['peril', 'scoreValue', 'riskBand', 'modelVersion', 'recommendedAction'],
    include: [
      {
        model: CatAssessment,
        as: 'assessment',
        attributes: ['submissionId'],
        required: true,
        where: { submissionId: { [Op.in]: uniqueSubmissionIds } },
      },
    ],
    order: [['id', 'ASC']],
  });

  const bySubmission = new Map<number, CatScoreSnapshot[]>();
  for (const row of rows as Array<CatScore & { assessment?: { submissionId?: number } }>) {
    const submissionId = Number(row.assessment?.submissionId);
    if (!Number.isFinite(submissionId)) {
      continue;
    }

    const snapshot: CatScoreSnapshot = {
      peril: String(row.peril ?? '').trim(),
      scoreValue: Number(row.scoreValue ?? 0),
      riskBand: row.riskBand ? String(row.riskBand) : null,
      modelVersion: row.modelVersion ? String(row.modelVersion) : null,
      recommendedAction: row.recommendedAction ? String(row.recommendedAction) : null,
    };

    const existing = bySubmission.get(submissionId) ?? [];
    existing.push(snapshot);
    bySubmission.set(submissionId, existing);
  }

  return bySubmission;
}

async function loadDistinctOptions(column: keyof CatScore): Promise<CatScoreOption[]> {
  const rows = await CatScore.findAll({
    attributes: [column as string],
    where: {
      [column]: {
        [Op.not]: null,
      },
    },
    order: [[column as string, 'ASC']],
    raw: true,
  });

  const values = new Set<string>();
  for (const row of rows as Array<Record<string, unknown>>) {
    const value = String(row[column as string] ?? '').trim();
    if (value) values.add(value);
  }

  return Array.from(values).map((value) => ({ value, label: value }));
}

export async function listCatScoreOptions(fieldId: string): Promise<CatScoreOption[]> {
  switch (fieldId) {
    case 'catperil':
      return loadDistinctOptions('peril');
    case 'catband':
      return loadDistinctOptions('riskBand');
    case 'catmodelversion':
      return loadDistinctOptions('modelVersion');
    case 'catrecommendedaction':
      return loadDistinctOptions('recommendedAction');
    default:
      return [];
  }
}

export async function listSubmissionCatAssessments(submissionId: number): Promise<Array<Record<string, unknown>>> {
  const rows = await CatAssessment.findAll({
    where: { submissionId },
    include: [{ model: CatScore, as: 'scores' }],
    order: [['assessmentDate', 'DESC'], ['id', 'DESC']],
  });

  return rows.map((assessment) => {
    const record = assessment as CatAssessment & { scores?: CatScore[] };
    return {
      id: record.id,
      submissionId: record.submissionId,
      assessmentExternalId: record.assessmentExternalId,
      subjectType: record.subjectType,
      subjectId: record.subjectId,
      assessmentDate: record.assessmentDate,
      currency: record.currency,
      inputExposureSnapshotId: record.inputExposureSnapshotId,
      scores: (record.scores ?? []).map((score) => ({
        id: score.id,
        peril: score.peril,
        value: Number(score.scoreValue),
        scaleMin: Number(score.scaleMin),
        scaleMax: Number(score.scaleMax),
        direction: score.direction,
        band: score.riskBand,
        percentile: score.percentile !== null ? Number(score.percentile) : null,
        scoreType: score.scoreType,
        primaryMetric: score.primaryMetric,
        financialPerspective: score.financialPerspective,
        exposureBasis: score.exposureBasis,
        modelVendor: score.modelVendor,
        modelName: score.modelName,
        modelVersion: score.modelVersion,
        eventCatalogVersion: score.eventCatalogVersion,
        runId: score.runId,
        recommendedAction: score.recommendedAction,
        confidence: score.confidence,
      })),
    };
  });
}

export async function createSubmissionCatAssessment(
  submissionId: number,
  input: CreateCatAssessmentInput,
): Promise<Record<string, unknown>> {
  const transaction = await CatAssessment.sequelize!.transaction();
  try {
    const scores = input.scores ?? [];
    const requestedPerils = Array.from(
      new Set(scores.map((score) => String(score.peril ?? '').trim().toLowerCase()).filter(Boolean)),
    );

    if (requestedPerils.length === 0) {
      throw new CatScoreValidationError('at_least_one_cat_score_required');
    }

    // CAT scores must reference canonical, active catastrophe perils only.
    const validPerils = await Peril.findAll({
      where: {
        code: { [Op.in]: requestedPerils },
        isCatastrophe: true,
        isActive: true,
      },
      attributes: ['code'],
      transaction,
    });

    const validPerilCodes = new Set(validPerils.map((entry) => String(entry.code).toLowerCase()));
    const invalidPerils = requestedPerils.filter((peril) => !validPerilCodes.has(peril));
    if (invalidPerils.length > 0) {
      throw new CatScoreValidationError(`invalid_cat_perils:${invalidPerils.join(',')}`);
    }

    const assessment = await CatAssessment.create(
      {
        submissionId,
        assessmentExternalId: input.assessmentExternalId ?? null,
        subjectType: input.subjectType ?? 'submission',
        subjectId: input.subjectId ?? null,
        assessmentDate: normalizeDateOnly(input.assessmentDate),
        currency: (input.currency ?? 'USD').toUpperCase(),
        inputExposureSnapshotId: input.inputExposureSnapshotId ?? null,
      },
      { transaction },
    );

    if (scores.length > 0) {
      await CatScore.bulkCreate(
        scores.map((score) => ({
          catAssessmentId: assessment.id,
          peril: String(score.peril ?? '').trim().toLowerCase(),
          scoreValue: Number(score.value),
          scaleMin: Number(score.scaleMin ?? 0),
          scaleMax: Number(score.scaleMax ?? 100),
          direction: normalizeDirection(score.direction),
          riskBand: score.band ?? null,
          percentile: score.percentile ?? null,
          scoreType: score.scoreType ?? null,
          primaryMetric: score.primaryMetric ?? null,
          financialPerspective: score.financialPerspective ?? null,
          exposureBasis: score.exposureBasis ?? null,
          modelVendor: score.modelVendor ?? null,
          modelName: score.modelName ?? null,
          modelVersion: score.modelVersion ?? null,
          eventCatalogVersion: score.eventCatalogVersion ?? null,
          runId: score.runId ?? null,
          recommendedAction: score.recommendedAction ?? null,
          confidence: score.confidence ?? null,
        })),
        { transaction },
      );
    }

    await transaction.commit();

    const [created] = await listSubmissionCatAssessments(submissionId);
    return created ?? {};
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
