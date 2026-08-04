import { PageTemplate, SchemaOptionSet, SchemaOptionSetItem, SubmissionOutput } from '../../../db/models';
import type { PageTemplateDefinition } from '../../../db/models/pageTemplates.models';
import { runStage } from '../stageResult';
import {
  ExtractedOptionSet,
  PAGE_KEY,
  SCHEMA_VERSION,
  adoptOrgTemplateAsBase,
  buildBaselineSchema,
  extractOptionSets,
  gatherContext,
  mergeTemplateDefinitions,
  prefillSchema,
  stripAiSpecialistSections,
  toStorableTemplate,
} from './logic';
import { GeminiSchemaAgent, SCHEMA_PROMPT_VERSION, SchemaAgent } from './GeminiSchemaProvider';
import { SchemaGenerationResult, SchemaGenerationSource, SubmissionFormContext, SuggestedFormDefinition } from './types';

/** The persisted, frontend-facing view of a generated form. */
export type PersistedSuggestedForm = {
  schema: SuggestedFormDefinition;
  source: SchemaGenerationSource;
  generatedAt: string;
  /** The org template coordinates this form maps to (for create-coverage field removal). */
  lineOfBusinessCode?: string;
  lineOfBusinessSubTypeCode?: string;
};

/** The lazy-loaded view of one field's option set (its {value,label} items). */
export type PersistedOptionSet = {
  optionSetKey: string;
  label: string | null;
  items: Array<{ value: string; label: string }>;
};

/**
 * Lazy-load the selection options for a form field, by the `optionSetKey` the
 * field carries. The create-coverage page fetches this the first time it renders
 * a `select`/`radio` field that references a set. Org-scoped: a set written for an
 * organization is matched on (organizationId, optionSetKey); `organizationId` may
 * be null for unscoped lookups. Returns null when no set exists.
 */
export async function loadOptionSet(
  optionSetKey: string,
  organizationId: number | null,
): Promise<PersistedOptionSet | null> {
  if (!optionSetKey) return null;
  const header = await SchemaOptionSet.findOne({
    where: { optionSetKey, ...(organizationId !== null ? { organizationId } : {}) },
    include: [{ model: SchemaOptionSetItem, as: 'items' }],
    order: [[{ model: SchemaOptionSetItem, as: 'items' }, 'order', 'ASC']],
  });
  if (!header) return null;
  const items = ((header.get('items') as SchemaOptionSetItem[] | undefined) ?? []).map((item) => ({
    value: item.value,
    label: item.label,
  }));
  return { optionSetKey: header.optionSetKey, label: header.label, items };
}

/**
 * Build the deterministic baseline form — the SAME default the schema agent
 * starts from — optionally tailored by line of business / portfolio size. The
 * frontend renders this until the agent has tailored a form for a specific
 * submission, so there is one source of truth and the default never drifts from
 * what the pipeline uses.
 */
export function buildBaselineForm(
  params: { lineOfBusinessCode?: string | null; lineOfBusinessLabel?: string | null; subjectCount?: number | null } = {},
): PersistedSuggestedForm {
  const context: SubmissionFormContext = {
    ...gatherContext(undefined),
    lineOfBusinessCode: params.lineOfBusinessCode ?? null,
    lineOfBusinessLabel: params.lineOfBusinessLabel ?? null,
    subjectCount: params.subjectCount ?? null,
  };
  return { schema: buildBaselineSchema(context), source: 'heuristic_schema', generatedAt: '' };
}

/**
 * Resolve the baseline form for a live page load: start from the platform default,
 * then adopt an organization/LOB template when one exists. This is the read path
 * the UI uses before a submission-specific generated schema is available.
 */
export async function resolveBaselineForm(
  params: {
    organizationId?: number | null;
    lineOfBusinessCode?: string | null;
    lineOfBusinessLabel?: string | null;
    lineOfBusinessSubTypeCode?: string | null;
    subjectCount?: number | null;
  } = {},
): Promise<PersistedSuggestedForm> {
  const context: SubmissionFormContext = {
    ...gatherContext(undefined),
    organizationId: params.organizationId ?? null,
    lineOfBusinessCode: params.lineOfBusinessCode ?? null,
    lineOfBusinessLabel: params.lineOfBusinessLabel ?? null,
    lineOfBusinessSubTypeCode: params.lineOfBusinessSubTypeCode ?? null,
    subjectCount: params.subjectCount ?? null,
  };

  if (context.organizationId === null) {
    return { schema: buildBaselineSchema(context), source: 'heuristic_schema', generatedAt: '' };
  }

  const base = { organizationId: context.organizationId, pageKey: PAGE_KEY, status: 'published' as const };
  const lineOfBusinessCode = context.lineOfBusinessCode ?? '';
  const lineOfBusinessSubTypeCode = context.lineOfBusinessSubTypeCode ?? '';
  const candidates = [
    lineOfBusinessCode || lineOfBusinessSubTypeCode
      ? { ...base, lineOfBusinessCode, lineOfBusinessSubTypeCode }
      : null,
    lineOfBusinessCode ? { ...base, lineOfBusinessCode, lineOfBusinessSubTypeCode: '' } : null,
    { ...base, lineOfBusinessCode: '', lineOfBusinessSubTypeCode: '' },
  ].filter((candidate): candidate is typeof base & { lineOfBusinessCode: string; lineOfBusinessSubTypeCode: string } => Boolean(candidate));

  for (const where of candidates) {
    const template = await PageTemplate.findOne({
      where,
      order: [['isDefault', 'DESC'], ['version', 'DESC'], ['updatedAt', 'DESC']],
    });
    if (template?.definitionJson && Array.isArray(template.definitionJson.sections)) {
      return {
        schema: adoptOrgTemplateAsBase(template.definitionJson, context),
        source: 'org_template',
        generatedAt: '',
        lineOfBusinessCode: where.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: where.lineOfBusinessSubTypeCode,
      };
    }
  }

  return { schema: buildBaselineSchema(context), source: 'heuristic_schema', generatedAt: '' };
}

/**
 * Read the suggested form previously persisted for a submission (by the stage's
 * `persistSafely`). Returns null when the submission has no document or the stage
 * has not run yet — the caller renders the baseline form in that case.
 */
export async function loadSuggestedForm(submissionId: number): Promise<PersistedSuggestedForm | null> {
  if (!Number.isFinite(submissionId)) return null;
  const doc = await SubmissionOutput.findOne({ where: { submissionId } });
  const record = (doc?.structuredData as Record<string, unknown> | undefined)?.schemaGeneration;
  if (!record || typeof record !== 'object') return null;
  const r = record as Partial<PersistedSuggestedForm>;
  if (!r.schema || !Array.isArray(r.schema.sections)) return null;
  return {
    // Submission snapshots created before subject ownership was enforced can
    // contain obsolete AI specialist tabs. Filter them on read so old forms are
    // corrected immediately, without requiring a user to regenerate them.
    schema: stripAiSpecialistSections(r.schema),
    source: r.source ?? 'heuristic_schema',
    generatedAt: r.generatedAt ?? '',
    lineOfBusinessCode: r.lineOfBusinessCode ?? '',
    lineOfBusinessSubTypeCode: r.lineOfBusinessSubTypeCode ?? '',
  };
}

/**
 * Schema-generation stage. Runs AFTER validation. Produces a suggested,
 * submission-specific form definition over the fixed create-coverage page. The
 * schema stage may add submission metadata and placement economics only; the
 * insured-subject stage owns line-of-business risk details and renders them in
 * each subject's reusable template.
 *
 * LLM-primary, fail-safe: the Gemini agent is the active generator when a key is
 * configured; otherwise (or on any failure) the deterministic baseline in
 * `./logic` is used. The stage never throws on a generation failure — a suggested
 * form is advisory, so it always returns a usable schema.
 */
export class SchemaGenerationService {
  private readonly agent: SchemaAgent;

  /** The Gemini agent is injectable for testing; dormant without a key. */
  constructor(deps: { schemaAgent?: SchemaAgent } = {}) {
    this.agent = deps.schemaAgent ?? new GeminiSchemaAgent();
  }

  async process(payload: unknown): Promise<Record<string, unknown>> {
    return runStage('schemaGeneration', () => this.runSchemaGeneration(payload));
  }

  private async runSchemaGeneration(payload: unknown): Promise<Record<string, unknown>> {
    const context = gatherContext(payload);

    // Reuse the org's existing line-of-business template as the base when present;
    // otherwise the standardized hardcoded base.
    const { base, fromOrgTemplate } = await this.resolveBaseSchema(context);

    const generated = await this.generateWithPolicy(context, base);
    const warnings: string[] = generated.warning ? [generated.warning] : [];
    // Prefill every field from the submission's extracted data.
    const prefilled = prefillSchema(generated.schema, context);
    // Lift every choice field's options into the option-set table and leave the
    // field referencing them by `optionSetKey`, so the UI lazy-loads them.
    const { schema, optionSets } = extractOptionSets(prefilled, context);
    const optionSetsPersisted = await this.persistOptionSetsSafely(context, optionSets);
    const source: SchemaGenerationSource = generated.source === 'gemini_schema'
      ? 'gemini_schema'
      : fromOrgTemplate
        ? 'org_template'
        : 'heuristic_schema';

    const result: SchemaGenerationResult = {
      schema,
      source,
      context,
      generatedAt: new Date().toISOString(),
    };

    const persisted = await this.persistSafely(context, result);

    // Promote the LLM's work into the reusable, line-of-business-keyed template
    // library: a form the agent tailored for this submission becomes (or extends)
    // the org's create-coverage template for this LOB, so the next submission of
    // the same line of business reuses it as the base. Only genuine LLM output is
    // promoted — a pure heuristic baseline or an unchanged org-template adoption
    // adds nothing new, so it is not written back.
    const templatePersisted = source === 'gemini_schema'
      ? await this.persistTemplateSafely(context, schema)
      : false;

    return {
      ok: true,
      service: 'schemaGeneration',
      schema,
      source,
      // Attribute LLM-generated forms to the prompt revision that produced them.
      ...(source === 'gemini_schema' ? { promptVersion: SCHEMA_PROMPT_VERSION } : {}),
      sectionCount: schema.sections.length,
      fieldCount: schema.sections.reduce((acc, s) => acc + s.fields.length, 0),
      subjectCount: context.subjectCount,
      persisted,
      templatePersisted,
      optionSetCount: optionSets.length,
      optionSetsPersisted,
      generatedAt: result.generatedAt,
      warnings,
    };
  }

  /**
   * Resolve the base template the agent extends: an organization's published
   * create-coverage template for the line of business when one exists, otherwise
   * the standardized hardcoded base. Best-effort — any DB error falls back to the
   * hardcoded base so the stage never fails on template lookup.
   */
  private async resolveBaseSchema(
    context: SubmissionFormContext,
  ): Promise<{ base: SuggestedFormDefinition; fromOrgTemplate: boolean }> {
    try {
      const orgTemplate = await this.loadOrgTemplate(context);
      if (orgTemplate && Array.isArray(orgTemplate.sections) && orgTemplate.sections.length > 0) {
        return { base: adoptOrgTemplateAsBase(orgTemplate, context), fromOrgTemplate: true };
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('schemaGeneration: org template lookup failed; using hardcoded base:', err instanceof Error ? err.message : err);
    }
    return { base: buildBaselineSchema(context), fromOrgTemplate: false };
  }

  /** Load the org's published create-coverage template for the LOB (LOB-specific first, then default). */
  private async loadOrgTemplate(context: SubmissionFormContext): Promise<PageTemplateDefinition | null> {
    if (context.organizationId === null) return null;
    const base = { organizationId: context.organizationId, pageKey: PAGE_KEY, status: 'published' as const };
    const lobSpecific = await PageTemplate.findOne({
      where: { ...base, lineOfBusinessCode: context.lineOfBusinessCode ?? '' },
      order: [['isDefault', 'DESC'], ['version', 'DESC']],
    });
    const template = lobSpecific
      ?? (await PageTemplate.findOne({ where: base, order: [['isDefault', 'DESC'], ['version', 'DESC']] }));
    return template?.definitionJson ?? null;
  }

  /**
   * Prefer the Gemini agent when configured; fall back to the deterministic
   * baseline if it is unavailable or the call fails. Always returns a schema.
   */
  private async generateWithPolicy(
    context: SubmissionFormContext,
    baseline: SuggestedFormDefinition,
  ): Promise<{ schema: SuggestedFormDefinition; source: 'gemini_schema' | 'heuristic_schema'; warning: string | null }> {
    if (this.agent.isAvailable()) {
      try {
        const schema = await this.agent.generate({ context, baseline });
        return { schema, source: 'gemini_schema', warning: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn('schemaGeneration: agent failed, falling back to baseline form:', message);
        return {
          schema: baseline,
          source: 'heuristic_schema',
          warning: `schema agent failed; baseline form used: ${message}`,
        };
      }
    }
    return { schema: baseline, source: 'heuristic_schema', warning: null };
  }

  /**
   * Persist the suggested form onto the submission's document, alongside the
   * extraction/OCR artifacts. Best-effort: a suggested form is advisory, so a
   * persistence hiccup is logged and reported (persisted=false) rather than
   * failing the stage.
   */
  private async persistSafely(context: SubmissionFormContext, result: SchemaGenerationResult): Promise<boolean> {
    if (context.submissionId === null) return false;
    try {
      const record = {
        schema: result.schema,
        source: result.source,
        generatedAt: result.generatedAt,
        // The org template coordinates this submission's form maps to, so the
        // create-coverage page can target the right template for field removal.
        lineOfBusinessCode: context.lineOfBusinessCode ?? '',
        lineOfBusinessSubTypeCode: context.lineOfBusinessSubTypeCode ?? '',
      };
      const doc = await SubmissionOutput.findOne({ where: { submissionId: context.submissionId } });
      if (!doc) {
        await SubmissionOutput.create({
          submissionId: context.submissionId,
          organizationId: context.organizationId,
          structuredData: { schemaGeneration: record },
        });
      } else {
        const existing = (doc.structuredData ?? {}) as Record<string, unknown>;
        doc.structuredData = { ...existing, schemaGeneration: record };
        await doc.save();
      }
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('schemaGeneration: failed to persist suggested form:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Write the generated form's STRUCTURE back into the reusable PageTemplate
   * library, keyed by organization + line of business + sub-type (the same
   * coordinates `loadOrgTemplate` reads from, so the next submission reuses it).
   *
   * Extend, never overwrite: when a template already exists for these coordinates
   * the new sections/fields are merged in append-only (see
   * `mergeTemplateDefinitions`), so a tenant's accumulated structure — including
   * any human edits — is preserved and only grows. When none exists, a published
   * AI-sourced template is created. Org-scoped only (no tenant → skip) and
   * best-effort: a failure here is logged and reported, never fatal to the stage.
   */
  private async persistTemplateSafely(context: SubmissionFormContext, schema: SuggestedFormDefinition): Promise<boolean> {
    if (context.organizationId === null) return false;
    try {
      const storable = toStorableTemplate(schema);
      const lineOfBusinessCode = context.lineOfBusinessCode ?? '';
      const lineOfBusinessSubTypeCode = context.lineOfBusinessSubTypeCode ?? '';
      const where = {
        organizationId: context.organizationId,
        scopeKey: `organization:${context.organizationId}`,
        pageKey: PAGE_KEY,
        lineOfBusinessCode,
        lineOfBusinessSubTypeCode,
      };
      const now = new Date();

      const existing = await PageTemplate.findOne({
        where,
        order: [['version', 'DESC'], ['updatedAt', 'DESC']],
      });

      if (existing) {
        // Extend the existing template in place — append-only union, preserving
        // the current status (don't downgrade a published/human template).
        const merged = mergeTemplateDefinitions(
          existing.definitionJson as unknown as SuggestedFormDefinition,
          storable,
        );
        existing.definitionJson = merged as unknown as PageTemplateDefinition;
        existing.publishedAt = existing.publishedAt ?? now;
        await existing.save();
        return true;
      }

      await PageTemplate.create({
        ...where,
        version: 1,
        status: 'published',
        schemaVersion: storable.schemaVersion ?? SCHEMA_VERSION,
        isDefault: false,
        source: 'ai',
        parentTemplateId: null,
        createdByUserId: null,
        publishedAt: now,
        definitionJson: storable as unknown as PageTemplateDefinition,
      });
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('schemaGeneration: failed to persist reusable template:', err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Persist the extracted choice-field options into the `schema_option_sets`
   * table, keyed by (organization, optionSetKey), so the UI lazy-loads them when
   * it renders the field. Upsert: an existing set for the key has its items
   * REPLACED with the latest generation (the agent's current choices), so a set
   * stays in sync with the field rather than accumulating stale options.
   *
   * Org-scoped (no tenant → skip) and best-effort: a failure here is logged and
   * reported, never fatal to the stage — the schema still carries each field's
   * `optionSetKey`, only the backing rows are missing. Returns how many sets were
   * written. Pure persistence; the extraction itself is the pure `extractOptionSets`.
   */
  private async persistOptionSetsSafely(
    context: SubmissionFormContext,
    optionSets: ExtractedOptionSet[],
  ): Promise<number> {
    if (context.organizationId === null || optionSets.length === 0) return 0;
    let written = 0;
    for (const set of optionSets) {
      try {
        const [header] = await SchemaOptionSet.findOrCreate({
          where: { organizationId: context.organizationId, optionSetKey: set.optionSetKey },
          defaults: {
            organizationId: context.organizationId,
            optionSetKey: set.optionSetKey,
            label: set.label,
            lineOfBusinessCode: context.lineOfBusinessCode ?? '',
            lineOfBusinessSubTypeCode: context.lineOfBusinessSubTypeCode ?? '',
            fieldKey: set.fieldKey,
            source: 'ai',
          },
        });

        // Keep header metadata in step with the latest generation.
        header.label = set.label;
        header.lineOfBusinessCode = context.lineOfBusinessCode ?? '';
        header.lineOfBusinessSubTypeCode = context.lineOfBusinessSubTypeCode ?? '';
        header.fieldKey = set.fieldKey;
        await header.save();

        // Replace ONLY the AI-generated items; user-added options (source
        // 'human', written by FieldOptionsService.addItem in the submission view)
        // survive every regeneration. Skip recreating an AI value a user already
        // owns under the same set so the human row stays authoritative.
        const humanItems = (await SchemaOptionSetItem.findAll({
          where: { optionSetId: header.id, source: 'human' },
          attributes: ['value'],
        })) as Array<{ value: string }>;
        const humanValues = new Set(humanItems.map((item) => item.value));

        await SchemaOptionSetItem.destroy({ where: { optionSetId: header.id, source: 'ai' } });
        await SchemaOptionSetItem.bulkCreate(
          set.items
            .filter((item) => !humanValues.has(item.value))
            .map((item, index) => ({
              optionSetId: header.id,
              value: item.value,
              label: item.label,
              order: index + 1,
              source: 'ai' as const,
            })),
        );
        written += 1;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `schemaGeneration: failed to persist option set ${set.optionSetKey}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    return written;
  }
}
