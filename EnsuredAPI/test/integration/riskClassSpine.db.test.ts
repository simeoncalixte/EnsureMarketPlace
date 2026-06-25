/**
 * Risk Class Registry spine — REAL-DATABASE integration test (Slices 1-3).
 *
 * The slice unit tests mock the model layer; this suite exercises the actual DB
 * wrappers against Postgres to discharge the standing "DB-backed paths unverified"
 * caveat: publishSchemaVersion, upsertRegistry, resolveRiskClass, and
 * canonicalizeAndPin (the live-pipeline write + opt-in enforcement).
 *
 * Requires Postgres on 127.0.0.1:5432 (see test/helpers/db.ts + globalSetup).
 */
import { getSequelize } from '../../src/config/database';
import { Organization, CanonicalSubmission, Submission } from '../../src/db/models';
import { RiskClassSchemaVersion } from '../../src/db/models/riskClassSchema.models';
import { RiskClassRegistry } from '../../src/db/models/riskClassRegistry.models';
import { PageTemplateDefinition } from '../../src/db/models/pageTemplates.models';
import { initTestDb } from '../helpers/db';
import { publishSchemaVersion } from '../../src/pipeline/schema/publish';
import { upsertRegistry } from '../../src/pipeline/registry/upsert';
import { resolveRiskClass } from '../../src/pipeline/registry/resolve';
import { canonicalizeAndPin } from '../../src/pipeline/canonicalize/service';
import { PAGE_KEY } from '../../src/pipeline/schemaGeneration/logic';

const LOB = 'general_liability';

function makeDefinition(label: string): PageTemplateDefinition {
  return {
    schemaVersion: 1,
    pageKey: PAGE_KEY,
    title: label,
    sections: [
      {
        key: 'financials',
        label: 'Financials',
        order: 1,
        fields: [
          {
            key: 'limit',
            label: 'Limit',
            type: 'number',
            order: 1,
            required: true,
            canonicalKey: 'financials.limit',
            constraints: { min: 0 },
          },
        ],
      },
    ],
  } as PageTemplateDefinition;
}

describe('Risk Class spine — real DB integration (Slices 1-3)', () => {
  (global as any).jest?.setTimeout?.(60000);

  let orgId: number;
  // Real submission parents — canonical_submissions.submission_id has a FK to
  // submissions(id) (via the Submission.hasOne(CanonicalSubmission) association).
  let subValidId: number;
  let subInvalidId: number;
  let subNoopId: number;

  beforeAll(async () => {
    await initTestDb();
    const org = await Organization.create({ name: 'Spine Test Insurer', type: 'insurer' } as any);
    orgId = org.id;
    const [sv, si, sn] = await Promise.all([
      Submission.create({ organizationId: org.id, status: 'draft' } as any),
      Submission.create({ organizationId: org.id, status: 'draft' } as any),
      Submission.create({ organizationId: org.id, status: 'draft' } as any),
    ]);
    subValidId = sv.id;
    subInvalidId = si.id;
    subNoopId = sn.id;
  }, 60000);

  afterAll(async () => {
    await getSequelize().close();
  });

  it('Slice 1: publishSchemaVersion creates an immutable version and is idempotent via content hash', async () => {
    const def = makeDefinition('GL Schema');

    const first = await publishSchemaVersion({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      pageKey: PAGE_KEY,
      definitionJson: def,
    });
    expect(first.created).toBe(true);
    expect(first.version.schemaVersion).toBe(1);
    expect(first.version.compiledJsonSchema).toBeTruthy();
    expect(first.version.contentHash).toEqual(expect.any(String));

    // Republishing identical content is a no-op (same row, no new version).
    const again = await publishSchemaVersion({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      pageKey: PAGE_KEY,
      definitionJson: def,
    });
    expect(again.created).toBe(false);
    expect(again.version.id).toBe(first.version.id);

    // Editing content produces a NEW immutable version; the old one is untouched.
    const editedDef = makeDefinition('GL Schema v2');
    editedDef.sections[0].fields.push({
      key: 'retention',
      label: 'Retention',
      type: 'number',
      order: 2,
      canonicalKey: 'financials.retention',
    } as any);
    const edited = await publishSchemaVersion({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      pageKey: PAGE_KEY,
      definitionJson: editedDef,
    });
    expect(edited.created).toBe(true);
    expect(edited.version.schemaVersion).toBe(2);

    const rows = await RiskClassSchemaVersion.count({ where: { organizationId: orgId, lineOfBusinessCode: LOB } });
    expect(rows).toBe(2);
  });

  it('Slice 2: upsertRegistry is upsert-stable and resolveRiskClass returns the org declaration', async () => {
    const v1 = await RiskClassSchemaVersion.findOne({
      where: { organizationId: orgId, lineOfBusinessCode: LOB, schemaVersion: 1 },
    });
    expect(v1).toBeTruthy();

    const created = await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      activeSchemaVersionId: v1!.id,
      riskModelingMethod: 'loss_triangle',
      ratingMethod: 'rate_on_line',
      appetiteDimensionsJson: { hazardClass: ['low', 'medium'] },
      requiredDataFieldsJson: ['financials.limit'],
    });

    // Second upsert on the same scope UPDATES the same row (unique scope index).
    const updated = await upsertRegistry({
      organizationId: orgId,
      lineOfBusinessCode: LOB,
      lineOfBusinessSubTypeCode: '',
      status: 'active',
      ratingMethod: 'technical_premium',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.ratingMethod).toBe('technical_premium');

    const count = await RiskClassRegistry.count({ where: { organizationId: orgId, lineOfBusinessCode: LOB } });
    expect(count).toBe(1);

    // Resolver returns the org declaration via the specificity ladder.
    const resolution = await resolveRiskClass(orgId, LOB, null);
    expect(resolution.resolvedFrom).toBe('org_primary');
    expect(resolution.riskModelingMethod).toBe('loss_triangle');
    expect(resolution.ratingMethod).toBe('technical_premium');
    expect(resolution.schemaVersionId).toBe(v1!.id);

    // Unknown line / no tenant falls back to the generic default (never throws).
    const fallback = await resolveRiskClass(null, 'nonexistent_lob', null);
    expect(fallback.resolvedFrom).toBe('generic_default');
    expect(fallback.riskModelingMethod).toBe('generic_burning_cost');
    expect(fallback.ratingMethod).toBe('generic_loss_ratio');
  });

  it('Slice 3: canonicalizeAndPin pins a submission and enforces the pinned schema', async () => {
    // Valid data → pinned + enforced ok.
    const valid = await canonicalizeAndPin({
      submissionId: subValidId,
      organizationId: orgId,
      data: { lineOfBusiness: LOB, 'financials.limit': 1_000_000 },
    });
    expect(valid.status).toBe('pinned');

    const validRow = await CanonicalSubmission.findOne({ where: { submissionId: subValidId } });
    expect(validRow!.lineOfBusinessCode).toBe(LOB);
    expect(validRow!.schemaVersionId).toBeTruthy();
    const pinnedVersionId = validRow!.schemaVersionId;

    // Replay (re-canonicalize) reuses the original pin — never re-pins.
    const replay = await canonicalizeAndPin({
      submissionId: subValidId,
      organizationId: orgId,
      data: { lineOfBusiness: LOB, 'financials.limit': 2_000_000 },
    });
    expect(replay.status).toBe('pinned');
    const replayRow = await CanonicalSubmission.findOne({ where: { submissionId: subValidId } });
    expect(replayRow!.schemaVersionId).toBe(pinnedVersionId);

    // Invalid data on a pinned schema → enforcement_failed (the intended opt-in {ok:false}).
    const invalid = await canonicalizeAndPin({
      submissionId: subInvalidId,
      organizationId: orgId,
      data: { lineOfBusiness: LOB, 'financials.limit': 'not-a-number' },
    });
    expect(invalid.status).toBe('enforcement_failed');
    if (invalid.status === 'enforcement_failed') {
      expect(invalid.errors.length).toBeGreaterThan(0);
    }
  });

  it('Slice 3 non-degradation: unmappable LOB is a strict no-op (no pin, no enforcement)', async () => {
    const outcome = await canonicalizeAndPin({
      submissionId: subNoopId,
      organizationId: orgId,
      data: { lineOfBusiness: 'totally-unknown-line', 'financials.limit': 5 },
    });
    expect(outcome.status).toBe('skipped');

    const row = await CanonicalSubmission.findOne({ where: { submissionId: subNoopId } });
    expect(row).toBeTruthy(); // canonical row still written
    expect(row!.schemaVersionId).toBeNull(); // but NOT pinned → no enforcement
  });
});
