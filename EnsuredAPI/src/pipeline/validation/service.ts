import { asNumber, toRecord } from './coerce';
import { loadAppetiteForTenant, evaluateAppetite } from './appetiteEngine';
import { resolveTaxonomyAppetiteInput } from './taxonomyResolve';
import { loadThirdPartySignals, ScrubProvider } from './scrub';
import { sequelizeSubmissionDocumentRepository, SubmissionDocumentRepository } from './repository';
import { DEFAULT_REQUIRED_FIELDS } from './types';
import {
  buildSemanticInput,
  interpretVerdict,
  DEFAULT_SEMANTIC_POLICY,
  SemanticJudge,
  SemanticPolicy,
} from './semantic';
import { geminiSemanticJudge } from './semanticAdapter';
import {
  aggregateDecision,
  buildScrubFindings,
  buildValidationResult,
  extractValidationFields,
  findMissingRequired,
  scoreDataQuality,
} from './logic';

type AppetiteLoader = typeof loadAppetiteForTenant;
type TaxonomyAppetiteResolver = typeof resolveTaxonomyAppetiteInput;

/** Injectable side-effecting collaborators; all default to the real adapters. */
export type ValidationDeps = {
  scrubProvider: ScrubProvider;
  appetiteLoader: AppetiteLoader;
  // Slice 4: resolves the OPTIONAL taxonomy-aware LOB appetite input. Best-effort
  // and fail-safe — returns null to make the engine fall back to free-text LOB.
  taxonomyAppetiteResolver: TaxonomyAppetiteResolver;
  repository: SubmissionDocumentRepository;
  semanticJudge: SemanticJudge;
  semanticPolicy: SemanticPolicy;
  clock: () => Date;
};

/**
 * Orchestrates the validation stage. The decision logic lives in pure functions
 * (./logic); this class only sequences the impure seams — scrub signals,
 * appetite load, persistence, and the clock — each of which is injectable so
 * the orchestration is testable without a database or network.
 */
export class ValidationService {
  private readonly deps: ValidationDeps;

  constructor(deps: Partial<ValidationDeps> = {}) {
    this.deps = {
      scrubProvider: deps.scrubProvider ?? loadThirdPartySignals,
      appetiteLoader: deps.appetiteLoader ?? loadAppetiteForTenant,
      taxonomyAppetiteResolver: deps.taxonomyAppetiteResolver ?? resolveTaxonomyAppetiteInput,
      repository: deps.repository ?? sequelizeSubmissionDocumentRepository,
      // LLM-primary: the Gemini semantic judge is the active validation agent
      // whenever GEMINI_API_KEY is set. It abstains (returns null) when no key is
      // configured or the call fails, and the rule-based engine (appetite + scrub)
      // remains as the fallback/complement — so the stage always produces a result.
      semanticJudge: deps.semanticJudge ?? geminiSemanticJudge,
      semanticPolicy: deps.semanticPolicy ?? DEFAULT_SEMANTIC_POLICY,
      clock: deps.clock ?? (() => new Date()),
    };
  }

  async process(payload: unknown): Promise<Record<string, unknown>> {
    const fields = extractValidationFields(payload);
    const submission = toRecord(toRecord(payload).submission);
    const submissionId = asNumber(submission.id);
    const tenantId = asNumber(submission.tenantId);

    // Impure seams, gathered up front.
    const signals = await this.deps.scrubProvider(fields.address, fields.domain);
    const appetite = await this.loadAppetiteSafely(tenantId);

    // Pure pipeline: data in, decision out.
    const requiredFields = appetite?.profile.requiredFields?.length
      ? appetite.profile.requiredFields
      : DEFAULT_REQUIRED_FIELDS;
    const missingRequired = findMissingRequired(fields, requiredFields);
    const scrubFindings = buildScrubFindings(signals);
    const dataQualityScore = scoreDataQuality(missingRequired.length, signals);

    // Slice 4: resolve the OPTIONAL taxonomy-aware LOB appetite input. This is the
    // only place DB resolution happens; the result is threaded into the pure engine
    // so the engine stays I/O-free. When it returns null (no taxonomy code resolves
    // or no taxonomy-aware appetite data), the engine uses the unchanged free-text
    // LOB matcher — identical to today's behavior.
    const taxonomyAppetite = appetite?.profile
      ? await this.resolveTaxonomyAppetiteSafely({
          tenantId,
          fields,
          allowedLinesOfBusiness: appetite.profile.allowedLinesOfBusiness ?? null,
        })
      : null;

    const appetiteResult = evaluateAppetite(
      { ...fields.appetite, dataQualityScore },
      appetite?.profile ?? null,
      appetite?.rules ?? [],
      taxonomyAppetite,
    );

    // Server-side LLM agent (Alibaba/DashScope): advisory by default, gated by
    // policy, fail-safe. The raw verdict is interpreted by a pure function.
    const verdict = await this.judgeSafely(
      buildSemanticInput(fields, appetite?.profile ?? null, appetite?.rules ?? []),
    );
    const semantic = interpretVerdict(verdict, this.deps.semanticPolicy);

    const outcome = aggregateDecision({ scrubFindings, missingRequired, appetiteResult, semantic });

    const validation = buildValidationResult({
      signals,
      scrubFindings,
      missingRequired,
      dataQualityScore,
      appetiteResult,
      semantic,
      outcome,
      now: this.deps.clock(),
    });

    // Impure seam: persist. A persistence failure is intentionally NOT swallowed
    // — losing the validation record should surface as a failed stage, unlike the
    // advisory appetite/judge seams which degrade silently.
    if (submissionId !== null) {
      await this.deps.repository.upsertValidation(submissionId, tenantId, validation);
    }

    return { ok: true, service: 'validation', ...validation };
  }

  /**
   * Resolve the taxonomy-aware LOB appetite input (Slice 4). Best-effort and
   * fail-safe: any error degrades to null so the engine falls back to the
   * unchanged free-text LOB matcher. The LOB free text comes from the SAME source
   * the appetite already uses (`fields.appetite.lineOfBusiness`); a structured
   * code is honored if normalization/extraction supplied one.
   */
  private async resolveTaxonomyAppetiteSafely(args: {
    tenantId: number | null;
    fields: ReturnType<typeof extractValidationFields>;
    allowedLinesOfBusiness: string[] | null;
  }): Promise<Awaited<ReturnType<TaxonomyAppetiteResolver>>> {
    try {
      const { fields } = args;
      return await this.deps.taxonomyAppetiteResolver({
        tenantId: args.tenantId,
        lineOfBusiness: fields.appetite.lineOfBusiness,
        lineOfBusinessCode:
          fields.normalized.lineOfBusinessCode ?? fields.extracted.lineOfBusinessCode,
        lineOfBusinessSubTypeCode:
          fields.normalized.lineOfBusinessSubTypeCode ?? fields.extracted.lineOfBusinessSubTypeCode,
        allowedLinesOfBusiness: args.allowedLinesOfBusiness,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'validation: taxonomy appetite resolve failed; using free-text LOB match:',
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  /**
   * Appetite load is best-effort: a transient DB error must not fail the whole
   * stage. Falling back to null preserves the "no profile ⇒ unchanged" contract.
   */
  private async loadAppetiteSafely(tenantId: unknown): Promise<Awaited<ReturnType<AppetiteLoader>>> {
    try {
      return await this.deps.appetiteLoader(tenantId as number | null | undefined);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('validation: appetite load failed; proceeding without it:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * The LLM judge is advisory and must never break the stage: any error (or an
   * unconfigured key) abstains, so validation proceeds on the deterministic
   * signals alone.
   */
  private async judgeSafely(input: Parameters<SemanticJudge>[0]): Promise<Awaited<ReturnType<SemanticJudge>>> {
    try {
      return await this.deps.semanticJudge(input);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('validation: semantic judge failed; proceeding without it:', err instanceof Error ? err.message : err);
      return null;
    }
  }
}
