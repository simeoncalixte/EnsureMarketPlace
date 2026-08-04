import { PageTemplate, SchemaOptionSet, SchemaOptionSetItem, SubmissionOutput } from '../../../db/models';
import type { PageTemplateDefinition } from '../../../db/models/pageTemplates.models';
import { PAGE_KEY } from './logic';
import { SuggestedFormDefinition } from './types';

// ---------------------------------------------------------------------------
// User-initiated removal of a field from an organization's create-coverage
// template. Three product decisions are encoded here:
//   - SCOPE: removal edits the org's reusable create-coverage PageTemplate, so
//     the field stops appearing on FUTURE submissions of that line of business.
//     Existing submissions keep their own rendered snapshot and data untouched.
//   - CONSISTENCY: existing submissions that have a value for the field are
//     reported (impact count) but NEVER mutated — removal is non-destructive.
//   - GUARD: only AI/custom, non-required fields are removable; the base
//     canonical scaffold and any required field are protected.
// ---------------------------------------------------------------------------

/** How many existing submissions have a populated value for the field (informational). */
export type FieldImpact = {
  dependentSubmissionCount: number;
  /** Up to 10 affected submission ids, for surfacing in the confirm dialog. */
  sampleSubmissionIds: number[];
};

export type RemoveFieldParams = {
  organizationId: number;
  /** Which org template to edit. Defaults to the create-coverage template. */
  pageKey?: string;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  sectionKey: string;
  fieldKey: string;
  /**
   * Compute the dependent-submission impact (create-coverage only — reads the
   * schemaGeneration snapshot). Defaults to true; subject removal passes false
   * since subject fields have no equivalent per-submission snapshot.
   */
  computeImpact?: boolean;
};

export type RemoveFieldResult =
  | { ok: true; removed: { sectionKey: string; fieldKey: string; label: string }; impact: FieldImpact; template: PageTemplateDefinition }
  | { ok: false; code: 'not_found' | 'forbidden' | 'invalid'; message: string };

/** A value counts as present unless it is null/undefined/blank (0 and false count). */
function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

/**
 * Count the submissions whose persisted create-coverage form has a populated
 * value for `sectionKey.fieldKey`. This reads each submission's own generated
 * snapshot (`SubmissionOutput.structuredData.schemaGeneration.schema`), which is
 * exactly what "depends on this field" means for the create-coverage form. Pure
 * read — nothing is mutated.
 */
export async function computeFieldImpact(
  organizationId: number,
  sectionKey: string,
  fieldKey: string,
): Promise<FieldImpact> {
  const docs = (await SubmissionOutput.findAll({ where: { organizationId } })) as Array<{
    submissionId: number | null;
    structuredData: Record<string, unknown> | null;
  }>;

  let dependentSubmissionCount = 0;
  const sampleSubmissionIds: number[] = [];

  for (const doc of docs) {
    const record = (doc.structuredData as Record<string, unknown> | null)?.schemaGeneration as
      | { schema?: SuggestedFormDefinition }
      | undefined;
    const schema = record?.schema;
    if (!schema?.sections) continue;
    const section = schema.sections.find((s) => s.key === sectionKey);
    const field = section?.fields?.find((f) => f.key === fieldKey);
    if (field && hasValue(field.value)) {
      dependentSubmissionCount += 1;
      if (sampleSubmissionIds.length < 10 && doc.submissionId != null) sampleSubmissionIds.push(doc.submissionId);
    }
  }

  return { dependentSubmissionCount, sampleSubmissionIds };
}

/**
 * Remove an AI-generated field from an organization's submission-view template,
 * going forward. Shared by the create-coverage and insured-subject paths — only
 * the `pageKey` (and whether impact is computed) differ. Returns a discriminated
 * result so the route maps failures to status codes. Existing submissions are
 * reported (impact) but left intact. The base canonical scaffold is protected;
 * this is distinct from the admin template-builder, which removes any field.
 */
export async function removeSubmissionTemplateField(params: RemoveFieldParams): Promise<RemoveFieldResult> {
  const { organizationId, lineOfBusinessCode, lineOfBusinessSubTypeCode, sectionKey, fieldKey } = params;
  const pageKey = params.pageKey ?? PAGE_KEY;
  if (!Number.isFinite(organizationId) || !sectionKey || !fieldKey) {
    return { ok: false, code: 'invalid', message: 'organizationId, sectionKey and fieldKey are required' };
  }

  // The same coordinates the stage writes the org template under (see persistTemplateSafely).
  const existing = await PageTemplate.findOne({
    where: {
      organizationId,
      scopeKey: `organization:${organizationId}`,
      pageKey,
      lineOfBusinessCode,
      lineOfBusinessSubTypeCode,
    },
    order: [['version', 'DESC'], ['updatedAt', 'DESC']],
  });
  if (!existing) {
    return { ok: false, code: 'not_found', message: `No ${pageKey} template for this organization and line of business` };
  }

  // Clone before mutating so a guard failure leaves the stored template untouched.
  const def = JSON.parse(JSON.stringify(existing.definitionJson)) as PageTemplateDefinition;
  const section = (def.sections ?? []).find((s) => s.key === sectionKey);
  if (!section) return { ok: false, code: 'not_found', message: `Section "${sectionKey}" not found in the template` };
  const field = (section.fields ?? []).find((f) => f.key === fieldKey);
  if (!field) return { ok: false, code: 'not_found', message: `Field "${fieldKey}" not found in section "${sectionKey}"` };

  // Guard: only AI-generated fields are removable; the base canonical scaffold is
  // protected. Required AI fields MAY be removed — any user in the org can prune an
  // AI suggestion, even a required one (e.g. an unwanted sub-type selector).
  if ((field as { origin?: string }).origin !== 'ai') {
    return { ok: false, code: 'forbidden', message: 'Only AI-generated fields can be removed' };
  }

  // Informational only — submission data is preserved. Skipped for pages without a
  // per-submission snapshot (e.g. insured subjects).
  const impact: FieldImpact =
    params.computeImpact === false
      ? { dependentSubmissionCount: 0, sampleSubmissionIds: [] }
      : await computeFieldImpact(organizationId, sectionKey, fieldKey);

  section.fields = (section.fields ?? []).filter((f) => f.key !== fieldKey);
  existing.definitionJson = def;
  await existing.save();

  // Best-effort: drop the field's now-orphaned option set (template config, not
  // submission data) so a removed select leaves no dangling option rows.
  const optionSetKey = (field as { optionSetKey?: string }).optionSetKey;
  if (optionSetKey) {
    try {
      const header = await SchemaOptionSet.findOne({ where: { organizationId, optionSetKey } });
      if (header) {
        await SchemaOptionSetItem.destroy({ where: { optionSetId: header.id } });
        await header.destroy();
      }
    } catch {
      /* orphaned option rows are non-fatal */
    }
  }

  return {
    ok: true,
    removed: { sectionKey, fieldKey, label: field.label ?? fieldKey },
    impact,
    template: def,
  };
}

/** Create-coverage submission-view field removal (computes dependent impact). */
export function removeCreateCoverageTemplateField(params: RemoveFieldParams): Promise<RemoveFieldResult> {
  return removeSubmissionTemplateField({ ...params, pageKey: params.pageKey ?? PAGE_KEY });
}

/**
 * Insured-subject submission-view field removal: targets the org `insured-subjects`
 * template (going forward). Impact is skipped (subject fields have no per-submission
 * snapshot); a field that lived only in the inline per-submission template returns
 * `not_found`, which the UI tolerates (the optimistic on-screen removal still holds).
 */
export function removeInsuredSubjectTemplateField(
  params: Omit<RemoveFieldParams, 'pageKey' | 'computeImpact'>,
): Promise<RemoveFieldResult> {
  return removeSubmissionTemplateField({ ...params, pageKey: 'insured-subjects', computeImpact: false });
}
