import { PageTemplate, SubmissionDocument } from '../../db/models';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import { runStage } from '../stageResult';
import {
  PAGE_KEY,
  SCHEMA_VERSION,
  adoptOrgTemplateAsBase,
  buildBaselineSchema,
  gatherContext,
  mergeTemplateDefinitions,
  prefillSchema,
  toStorableTemplate,
} from './logic';
import { GeminiSchemaAgent, SchemaAgent } from './GeminiSchemaProvider';
import { SchemaGenerationResult, SchemaGenerationSource, SubmissionFormContext, SuggestedFormDefinition } from './types';

/** The persisted, frontend-facing view of a generated form. */
export type PersistedSuggestedForm = {
  schema: SuggestedFormDefinition;
  source: SchemaGenerationSource;
  generatedAt: string;
};

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
 * Read the suggested form previously persisted for a submission (by the stage's
 * `persistSafely`). Returns null when the submission has no document or the stage
 * has not run yet — the caller renders the baseline form in that case.
 */
export async function loadSuggestedForm(submissionId: number): Promise<PersistedSuggestedForm | null> {
  if (!Number.isFinite(submissionId)) return null;
  const doc = await SubmissionDocument.findOne({ where: { submissionId } });
  const record = (doc?.structuredData as Record<string, unknown> | undefined)?.schemaGeneration;
  if (!record || typeof record !== 'object') return null;
  const r = record as Partial<PersistedSuggestedForm>;
  if (!r.schema || !Array.isArray(r.schema.sections)) return null;
  return { schema: r.schema, source: r.source ?? 'heuristic_schema', generatedAt: r.generatedAt ?? '' };
}

/**
 * Schema-generation stage. Runs AFTER validation. Produces a suggested,
 * submission-specific form definition (a superset of the standard create-coverage
 * page) so the UI can render a form tailored to what actually came in — extra
 * sections/fields for the line of business and peril, and a repeatable insured-
 * subjects section for portfolios.
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
    // Prefill every field from the submission's extracted data.
    const schema = prefillSchema(generated.schema, context);
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
      sectionCount: schema.sections.length,
      fieldCount: schema.sections.reduce((acc, s) => acc + s.fields.length, 0),
      subjectCount: context.subjectCount,
      persisted,
      templatePersisted,
      generatedAt: result.generatedAt,
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
    if (context.tenantId === null) return null;
    const base = { organizationId: context.tenantId, pageKey: PAGE_KEY, status: 'published' as const };
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
  ): Promise<{ schema: SuggestedFormDefinition; source: 'gemini_schema' | 'heuristic_schema' }> {
    if (this.agent.isAvailable()) {
      try {
        const schema = await this.agent.generate({ context, baseline });
        return { schema, source: 'gemini_schema' };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('schemaGeneration: agent failed, falling back to baseline form:', err instanceof Error ? err.message : err);
      }
    }
    return { schema: baseline, source: 'heuristic_schema' };
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
      };
      const doc = await SubmissionDocument.findOne({ where: { submissionId: context.submissionId } });
      if (!doc) {
        await SubmissionDocument.create({
          submissionId: context.submissionId,
          tenantId: context.tenantId,
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
    if (context.tenantId === null) return false;
    try {
      const storable = toStorableTemplate(schema);
      const lineOfBusinessCode = context.lineOfBusinessCode ?? '';
      const lineOfBusinessSubTypeCode = context.lineOfBusinessSubTypeCode ?? '';
      const where = {
        organizationId: context.tenantId,
        scopeKey: `organization:${context.tenantId}`,
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
}
