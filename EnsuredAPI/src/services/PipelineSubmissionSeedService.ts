import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { Op } from 'sequelize';
import {
  IngestionChannel,
  IngestionEvent,
  InsurerProfile,
  PipelineLifecycleSubscription,
  RiskPortfolio,
  Submission,
  SubmissionFile,
  SubmissionOutput,
} from '../db/models';
import { getSequelize } from '../db/config/database';
import { PIPELINE_STAGE_CATALOG } from './pipeline/stages/registry';
import { routeForType } from './pipeline/routing/routes';
import { SUBMISSION_TYPE_CODES, submissionTypeTaxonomy } from '../db/seed-data/submissionTypeTaxonomy';
import {
  assignComplexities,
  buildSubmissionPackage,
  summarizeComplexity,
  type PackageManifest,
} from './submissionPackages';
import {
  assignScenarios,
  resolveScenario,
  SCENARIO_KEYS,
  type ScenarioMetadata,
  type SubmissionScenarioKey,
} from './submissionScenarios';
import { buildDocumentContent, deriveSubmissionFacts } from './submissionDocumentContent';

/**
 * Seeds "incoming" submissions directly into a single organization's ingestion
 * pipeline so the document pipeline can be exercised manually from the Pipeline
 * Processes board (each card's "Run next stage" button drives one stage at a
 * time — see `pipeline/commands/service.PipelineCommandService`).
 *
 * A submission only surfaces on that board when (1) its insurer profile belongs
 * to the viewing organization and (2) the organization is subscribed to the lane
 * the submission currently sits in. This service guarantees both for the target
 * org: it ensures an insurer profile + portfolio, attaches the submissions to an
 * ingestion channel for lineage, writes a `received` ingestion event each, and
 * (by default) subscribes the org to every pipeline stage so the seeded cards are
 * visible and can be advanced end-to-end.
 *
 * Each submission is dressed with a realistic insurance/reinsurance/brokerage
 * **document package** (a placing slip, statement of values, loss runs, cat-model
 * output, site photographs, etc.) drawn from {@link buildSubmissionPackage}. The
 * package size and exotic-ness track a 1..10 complexity score whose mean across
 * the batch is exactly 7 (a deliberately demanding book), so the seeded board
 * looks like real inbound business rather than a row of empty cards. Every
 * attachment is backed by a real, OCR-readable file — a generated text extract
 * plus, for each package document, a format-compatible fixture from the OCR
 * corpus (`test/fixtures/ocr-corpus`) — so advancing a card extracts genuine
 * text instead of warning "Unable to read".
 */

export interface PipelineSubmissionSeedOptions {
  /** How many incoming submissions to create (clamped to 1..50, default 3). */
  count?: number;
  /**
   * Subscribe the organization to every pipeline stage so the seeded submissions
   * are visible on the board and can be advanced through each lane. Default true.
   */
  ensureSubscriptions?: boolean;
  /**
   * Attach the document package (and a real text extract) to each submission so
   * the board shows realistic attachment counts and OCR produces data when a card
   * is advanced. Default true; set false for bare submissions.
   */
  attachDocuments?: boolean;
  /**
   * Target mean complexity (1..10) across the batch. Default 7 — i.e. the average
   * seeded submission is appreciably complex, per the brief.
   */
  complexityTarget?: number;
  /**
   * Which business scenario(s) to seed. `'weighted'` (default) draws from the
   * standard mix (Renewal 30% / New Business 25% / Multi-LOB 15% / Facultative
   * 10% / Treaty 10% / Referred 5% / Declined 3% / SLA Breach 2%). A specific
   * scenario key seeds the whole batch as that scenario — handy for targeting one
   * workflow path (e.g. `'declined'`, `'sla_breach'`, `'multi_lob'`).
   */
  scenario?: SubmissionScenarioKey | 'weighted';
  /**
   * Pin every seeded submission to a specific transaction type so it is
   * unambiguously a new-business / renewal / quote-request / endorsement / claim /
   * … submission as it travels the pipeline. `'auto'` (default) leaves the type to
   * the pipeline's `submissionType` stage, as before. A specific primary code (any
   * of {@link SUBMISSION_TYPE_CODES}, e.g. `'renewal'`, `'endorsement'`) both
   * pre-stamps `structured_data.submissionTypeCode/Label` (so per-type boards and
   * routing reflect it immediately) AND injects a strong type signal into the OCR
   * extract so the live `submissionType` stage confirms the same type when run.
   */
  submissionType?: string | 'auto';
}

export interface SeededSubmissionSummary {
  id: number;
  submissionNumber: string;
  status: string;
  source: string | null;
  transport: string | null;
  receivedAt: string | null;
  /** The real on-disk text extract attached for OCR, if any. */
  fileName: string | null;
  /** 1..10 complexity score driving this submission's package. */
  complexity: number;
  /** Primary line of business (lead line for a multi-LOB submission). */
  lineOfBusiness: string;
  /** Every line of business bundled into the submission. */
  lineOfBusinesses: string[];
  cedent: string;
  /** Total attachments on the submission (package files + text extract). */
  fileCount: number;
  // --- Transaction (submission) type ---
  /** Pinned transaction-type code when one was requested, else null (auto). */
  submissionTypeCode: string | null;
  /** Human label for {@link submissionTypeCode}, else null. */
  submissionTypeLabel: string | null;
  /** Whether the type was pinned at seed time (vs. left to the pipeline). */
  submissionTypePinned: boolean;
  // --- Business scenario classification (per the seeding brief) ---
  scenario: SubmissionScenarioKey;
  scenarioLabel: string;
  scenarioVariant: string;
  priority: ScenarioMetadata['priority'];
  expectedWorkflowPath: string[];
  expectedOutcome: ScenarioMetadata['expectedOutcome'];
  underwriterType: ScenarioMetadata['underwriterType'];
  slaClassification: ScenarioMetadata['slaClassification'];
}

export interface PipelineSubmissionSeedSummary {
  organizationId: number;
  insurerProfileId: number;
  portfolioId: number;
  channelId: number | null;
  channelLabel: string | null;
  submissionsCreated: number;
  /** Count of real on-disk text extracts written (OCR-readable). */
  documentsCreated: number;
  /** Count of all SubmissionFile rows created across the batch. */
  filesCreated: number;
  /** Mean complexity across the batch — 7 by default, per the brief. */
  averageComplexity: number;
  complexityRange: { min: number; max: number };
  /** How many submissions landed in each business scenario across the batch. */
  scenarioBreakdown: Partial<Record<SubmissionScenarioKey, number>>;
  /** The pinned transaction type for the batch, or null when left to the pipeline. */
  submissionTypeCode: string | null;
  submissionTypeLabel: string | null;
  submissions: SeededSubmissionSummary[];
  subscribedStages: string[];
}

// Transport per known channel type (mirrors ChannelSeedService blueprints and
// the channel types the UI knows how to render).
const TRANSPORT_BY_TYPE: Record<string, string> = {
  rabbitmq: 'amqp',
  'email-sso': 'email',
  'cloud-storage': 's3',
  sftp: 'sftp',
  webhooks: 'webhook',
};

// The OCR fixture corpus (`test/fixtures/ocr-corpus`, generated by
// `npm run corpus:generate`). Resolved relative to this file so it works under
// ts-node (src/services) and the compiled build (dist/services) alike. Seeding
// is a manual pipeline-testing aid, so reaching into the test fixtures is by
// design; a fixture-less deploy simply falls back to the logical storage path.
const OCR_CORPUS_DIR = path.resolve(__dirname, '..', '..', 'test', 'fixtures', 'ocr-corpus');

/**
 * Resolve a package attachment's `corpusFile` to a real, readable on-disk path
 * (with its true byte size) so the OCR stage extracts genuine text. Returns null
 * when the fixture is missing/empty, letting the caller fall back to the
 * attachment's logical (unreadable) storage path — preserving prior behaviour.
 */
async function resolveCorpusFile(
  corpusFile: string | undefined,
): Promise<{ storagePath: string; fileSize: number } | null> {
  if (!corpusFile) return null;
  const abs = path.join(OCR_CORPUS_DIR, corpusFile);
  // Guard against path traversal out of the corpus dir (corpusFile is internal,
  // but keep the fs reach narrow regardless).
  if (!abs.startsWith(OCR_CORPUS_DIR + path.sep)) return null;
  try {
    const stat = await fs.stat(abs);
    if (stat.isFile() && stat.size > 0) return { storagePath: abs, fileSize: stat.size };
  } catch {
    // Fixture absent (e.g. corpus not generated, or a deploy without test/).
  }
  return null;
}

function submissionNumber(id: number): string {
  return `SUB-${String(id).padStart(4, '0')}`;
}

function hostSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'cedent';
}

/**
 * Build a realistic, text-based submission extract from a package manifest so the
 * OCR stage extracts real text and the downstream classification/extraction
 * stages have a cedent, broker, line of business, dates, currency and contacts to
 * work with. Mirrors what a broker's slip/ACORD data extract looks like.
 */
function buildSubmissionExtractText(
  manifest: PackageManifest,
  num: string,
  scenario: ScenarioMetadata,
  pinnedType: PinnedSubmissionType | null = null,
): string {
  const tivMillions = 40 + manifest.complexity * 18 + manifest.fileCount * 3;
  const premiumMillions = (2 + manifest.complexity * 0.9).toFixed(1);
  const phone = String(((manifest.complexity * 137) % 900) + 100).padStart(4, '0');
  const layer = manifest.reinsuranceType === 'treaty' ? 'Excess of Loss / Quota Share' : 'Facultative certificate';
  const lobLine = manifest.lineOfBusinesses.length > 1
    ? manifest.lineOfBusinesses.join(' + ')
    : manifest.lineOfBusiness;
  // When a transaction type is pinned, frame the extract around it so the live
  // `submissionType` stage lands on the requested type rather than inferring one
  // from the (reinsurance-shaped) package. Reinsurance pins keep the reinsurance
  // framing; non-reinsurance pins drop the treaty/fac-specific lines that would
  // otherwise pull the keyword classifier toward a reinsurance type.
  const reinsuranceFramed = !pinnedType || pinnedType.isReinsurance;
  const lines: string[] = [
    reinsuranceFramed ? 'Reinsurance Submission Extract (ACORD-style)' : 'Insurance Submission Extract (ACORD-style)',
    `Submission: ${num}`,
  ];
  if (pinnedType) {
    // Lead with an unambiguous transaction-type declaration plus the type's
    // defining keywords so both the keyword heuristic and the Gemini agent agree.
    lines.push(`Transaction Type: ${pinnedType.label}`, pinnedType.signal);
  }
  lines.push(
    // Scenario signal so the downstream classification/extraction stages have
    // something matching the seeded business scenario to work with.
    `Submission Scenario: ${scenario.scenarioLabel} (${scenario.variantLabel})`,
    `Priority: ${scenario.priority} | SLA: ${scenario.slaClassification} | Assigned UW: ${scenario.underwriterType}`,
    `Cedent (Reinsured): ${manifest.cedents.join(', ')}`,
    `Broker / Intermediary: ${manifest.broker}`,
    `Line(s) of Business: ${lobLine}`,
  );
  if (reinsuranceFramed) {
    lines.push(`Placement: ${manifest.reinsuranceType === 'treaty' ? 'Treaty' : 'Facultative'} — ${layer}`);
  }
  lines.push(
    `Perils: ${manifest.perils.join(', ')}`,
    `Territory / Region: ${manifest.regions.join(', ')}`,
    `Currency: ${manifest.currency}`,
    'Effective Date: 2026-07-01',
    'Expiration Date: 2027-07-01',
    `Total Insured Value: ${manifest.currency} ${tivMillions},000,000`,
    `Estimated Premium: ${manifest.currency} ${premiumMillions}M`,
    `Underwriter Contact: underwriting@${hostSlug(manifest.cedent)}.example`,
    `Phone: +1 (305) 555-${phone}`,
    `Attachments: ${manifest.fileCount} document(s) — ${manifest.categories.join(', ')}.`,
    `Complexity: ${manifest.complexity}/10.`,
  );
  return lines.join('\n');
}

/** submission-type code → human label (for persisted structured_data). */
const SUBMISSION_TYPE_LABEL = new Map(submissionTypeTaxonomy.map((type) => [type.code, type.label]));

/** A caller-pinned transaction type resolved for one submission. */
interface PinnedSubmissionType {
  code: string;
  label: string;
  /** Strong, keyword-rich sentence that makes the type unambiguous in the OCR text. */
  signal: string;
  /** Treaty/facultative reinsurance types keep the reinsurance extract framing. */
  isReinsurance: boolean;
}

/**
 * Strong, OCR-readable declarations keyed to each primary submission-type code.
 * Each packs several of the type's defining keyword phrases (mirroring the
 * `submissionType` stage's keyword dictionary) so that, even on a reinsurance
 * package, the classifier scores the pinned type highest. (pure)
 */
const SUBMISSION_TYPE_SIGNAL: Record<string, string> = {
  new_business:
    'This is a New Business submission — a new account / application for insurance requesting a quote to bind new coverage effective on the effective date below.',
  renewal:
    'This is a Renewal — renewal of the expiring policy at its anniversary date; renewal terms are requested for continuation of coverage.',
  quote_request:
    'This is a Quote Request — please quote / provide a quotation and pricing request for the coverage described below.',
  endorsement:
    'This is an Endorsement — a mid-term policy change / amendment to amend the policy, effective the date of change below.',
  cancellation:
    'This is a Cancellation — notice of cancellation to cancel the policy and terminate coverage on the date below.',
  claim:
    'This is a Claim / Loss Notice — a notice of loss reporting a claim; date of loss and claimant details follow for the adjuster.',
  audit:
    'This is a Premium Audit — a final premium audit covering the audit period and the audited exposures below.',
  treaty_reinsurance:
    'This is a Treaty Reinsurance placement — a reinsurance treaty cession of the ceding company\'s underlying portfolio (whole book).',
  facultative_reinsurance:
    'This is a Facultative Reinsurance placement — a facultative certificate to cede this single risk (fac placement).',
  inquiry:
    'This is a general Inquiry — please advise on the question regarding the account below; this is an information request.',
};

const REINSURANCE_TYPE_CODES = new Set(['treaty_reinsurance', 'facultative_reinsurance']);

/**
 * Resolve a caller-supplied submission-type option into a pinned descriptor, or
 * null for `'auto'`/unset/unrecognized (leave the type to the pipeline). (pure)
 */
function resolvePinnedSubmissionType(option: string | undefined): PinnedSubmissionType | null {
  if (!option || option === 'auto' || !SUBMISSION_TYPE_CODES.includes(option)) return null;
  return {
    code: option,
    label: SUBMISSION_TYPE_LABEL.get(option) ?? option,
    signal: SUBMISSION_TYPE_SIGNAL[option] ?? `This is a ${SUBMISSION_TYPE_LABEL.get(option) ?? option} submission.`,
    isReinsurance: REINSURANCE_TYPE_CODES.has(option),
  };
}

/** Weighted bag so simulated submissions fan out across routes (new business is
 * the most common, but every type is represented so the Sankey fork is rich). */
const WEIGHTED_SUBMISSION_TYPES = [
  'new_business', 'new_business', 'new_business', 'renewal', 'renewal', 'quote_request',
  'endorsement', 'endorsement', 'claim', 'claim', 'cancellation',
  'treaty_reinsurance', 'facultative_reinsurance', 'audit', 'inquiry',
];

/** Map the seeding scenario (on the 'received' event) to a submission type, or
 * draw a weighted-random one when the scenario doesn't pin a type. */
function pickSubmissionType(meta: Record<string, unknown>): string {
  const reinsurance = String(meta.reinsuranceType ?? '');
  if (reinsurance === 'treaty') return 'treaty_reinsurance';
  if (reinsurance === 'facultative') return 'facultative_reinsurance';
  const direct: Record<string, string> = {
    new_business: 'new_business',
    renewal: 'renewal',
    endorsement: 'endorsement',
    facultative: 'facultative_reinsurance',
    treaty: 'treaty_reinsurance',
  };
  const mapped = direct[String(meta.scenario ?? '')];
  if (mapped) return mapped;
  return WEIGHTED_SUBMISSION_TYPES[Math.floor(Math.random() * WEIGHTED_SUBMISSION_TYPES.length)];
}

export class PipelineSubmissionSeedService {
  /**
   * Seed incoming submissions for `organizationId`, attributing them to
   * `submittedByUserId` (the calling user). Runs in a single transaction.
   */
  async seedForOrganization(
    organizationId: number,
    submittedByUserId: number | null,
    options: PipelineSubmissionSeedOptions = {},
  ): Promise<PipelineSubmissionSeedSummary> {
    const count = Math.min(Math.max(Math.trunc(Number(options.count ?? 3)) || 3, 1), 50);
    const ensureSubscriptions = options.ensureSubscriptions ?? true;
    const attachDocuments = options.attachDocuments ?? true;
    const complexityTarget = Math.min(Math.max(Math.trunc(Number(options.complexityTarget ?? 7)) || 7, 1), 10);

    // Per-submission complexity scores whose mean is exactly `complexityTarget`.
    const complexities = assignComplexities(count, complexityTarget);

    // Per-submission business scenario. 'weighted' (default) draws the standard
    // mix; a specific key seeds the whole batch as that one scenario.
    const requestedScenario = options.scenario ?? 'weighted';
    const scenarioKeys: SubmissionScenarioKey[] =
      requestedScenario !== 'weighted' && SCENARIO_KEYS.includes(requestedScenario)
        ? Array.from({ length: count }, () => requestedScenario)
        : assignScenarios(count);

    // Optional caller-pinned transaction type for the whole batch (null = auto).
    const pinnedType = resolvePinnedSubmissionType(options.submissionType);

    const sequelize = getSequelize();
    // Real text extracts are written to disk only after the transaction commits
    // (below), so a rollback never leaves orphaned files.
    const pendingFiles: Array<{ storagePath: string; content: string }> = [];
    const result = await sequelize.transaction(async (transaction) => {
      // 1. Insurer profile for the caller's org — the board scopes submissions by
      //    `insurerProfile.organizationId`, so submissions must hang off it.
      const [insurerProfile] = await InsurerProfile.findOrCreate({
        where: { organizationId },
        defaults: { organizationId, rating: 'A', domicile: 'Bermuda' },
        transaction,
      });

      // 2. A risk portfolio so the board can render premium / exposure / line-of-
      //    business / region facts. Reuse an existing one when present.
      let portfolio = await RiskPortfolio.findOne({
        where: { insurerProfileId: insurerProfile.id },
        order: [['id', 'DESC']],
        transaction,
      });
      if (!portfolio) {
        portfolio = await RiskPortfolio.create(
          {
            insurerProfileId: insurerProfile.id,
            name: 'Manual Pipeline Test Portfolio',
            region: 'US-Southeast',
            perilType: 'hurricane',
            totalExposure: '50000000.00',
            totalPremium: '2500000.00',
            currency: 'USD',
          },
          { transaction },
        );
      }

      // 3. Reuse an ingestion channel for the org (prefer an enabled one) so the
      //    submissions carry channel lineage; create a lightweight one otherwise.
      let channel = await IngestionChannel.findOne({
        where: { organizationId: organizationId },
        order: [
          ['enabled', 'DESC'],
          ['id', 'DESC'],
        ],
        transaction,
      });
      if (!channel) {
        channel = await IngestionChannel.create(
          {
            organizationId: organizationId,
            type: 'webhooks',
            label: 'Manual Seed',
            enabled: true,
            status: 'active',
            meta: 'Seeded for manual pipeline testing',
            config: {},
          },
          { transaction },
        );
      }
      const source = channel.type;
      const transport = TRANSPORT_BY_TYPE[channel.type] ?? 'manual';

      // 4. Create the incoming submissions (status 'submitted' → ingestion lane),
      //    each with a realistic document package and a 'received' ingestion event.
      const now = Date.now();
      const submissions: SeededSubmissionSummary[] = [];
      let filesCreated = 0;
      let documentsCreated = 0;
      for (let i = 0; i < count; i += 1) {
        const complexity = complexities[i];
        const submission = await Submission.create(
          {
            insurerProfileId: insurerProfile.id,
            portfolioId: portfolio.id,
            submittedByUserId,
            status: 'submitted',
            organizationId: organizationId,
            source,
            transport,
            // Stagger receivedAt so the newest sorts first on the board.
            receivedAt: new Date(now - i * 60 * 1000),
            ingestionChannelId: channel.id,
          },
          { transaction },
        );

        const num = submissionNumber(submission.id);

        // Resolve this submission's business scenario (deterministic in its id):
        // its tag metadata and the directives that shape the document package.
        const { metadata: scenarioMeta, directives } = resolveScenario(scenarioKeys[i], submission.id);
        // Some scenarios (cat-exposed, large-capacity, portfolio) demand a richer,
        // more complex package than the base draw.
        const effectiveComplexity = directives.complexityFloor
          ? Math.max(complexity, directives.complexityFloor)
          : complexity;
        // SLA-breach submissions are received well in the past so the card lands
        // overdue against any SLA window the board enforces.
        if (directives.receivedAtAgeDays && directives.receivedAtAgeDays > 0) {
          const breachedAt = new Date(now - directives.receivedAtAgeDays * 24 * 60 * 60 * 1000);
          await submission.update({ receivedAt: breachedAt }, { transaction });
        }

        // Deterministic package keyed by the submission id and shaped by the
        // scenario directives (which lines of business, treaty/fac, missing docs,
        // cat perils, multiple insureds).
        const pkg = buildSubmissionPackage(submission.id, effectiveComplexity, {
          organizationId,
          submissionId: submission.id,
          archetypeCodes: directives.archetypeCodes,
          reinsuranceType: directives.reinsuranceType,
          perilFilter: directives.perilFilter,
          dropCategories: directives.dropCategories,
          multipleInsureds: directives.multipleInsureds,
        });

        let fileName: string | null = null;
        let fileCount = 0;
        if (attachDocuments) {
          // 4a. A real, OCR-readable text extract, created FIRST so it sorts to the
          //     front of the OCR stage's (id-ordered, capped) file scan.
          fileName = `${hostSlug(pkg.manifest.cedent)}_SubmissionExtract_${submission.id}.txt`;
          const content = buildSubmissionExtractText(pkg.manifest, num, scenarioMeta, pinnedType);
          const storagePath = path.join(
            os.tmpdir(),
            'ensured-pipeline-seed',
            `submission-${submission.id}`,
            fileName,
          );
          await SubmissionFile.create(
            {
              submissionId: submission.id,
              organizationId: organizationId,
              fileName,
              fileType: 'text/plain',
              fileSize: Buffer.byteLength(content, 'utf8'),
              storagePath,
              checksum: null,
              uploadedAt: new Date(),
            },
            { transaction },
          );
          pendingFiles.push({ storagePath, content });
          documentsCreated += 1;
          fileCount += 1;

          // 4b. The rest of the package — cover note, SOVs, loss runs, slips, cat
          //     models, etc. Each readable role is rendered with per-submission
          //     content that MATCHES the extract (same cedent/broker/LOB/currency/
          //     TIV/dates) and an honest MIME type, written to the same temp dir as
          //     the extract. Image/archive roles can't be synthesised as text, so
          //     they keep their real OCR-readable corpus fixture (or fall back to
          //     the logical storage path when the fixture is absent).
          if (pkg.files.length > 0) {
            const facts = deriveSubmissionFacts(pkg.manifest, num);
            const rows = await Promise.all(
              pkg.files.map(async (f) => {
                const content = buildDocumentContent(f.category, f.kind, facts, f.fileName);
                if (content) {
                  const synthName = f.fileName.replace(/\.[^.]+$/, `.${content.ext}`);
                  const synthPath = path.join(
                    os.tmpdir(),
                    'ensured-pipeline-seed',
                    `submission-${submission.id}`,
                    synthName,
                  );
                  pendingFiles.push({ storagePath: synthPath, content: content.text });
                  return {
                    submissionId: submission.id,
                    organizationId: organizationId,
                    fileName: synthName,
                    fileType: content.mime,
                    fileSize: Buffer.byteLength(content.text, 'utf8'),
                    storagePath: synthPath,
                    checksum: f.checksum,
                    uploadedAt: new Date(),
                  };
                }
                const real = await resolveCorpusFile(f.corpusFile);
                return {
                  submissionId: submission.id,
                  organizationId: organizationId,
                  fileName: f.fileName,
                  fileType: f.fileType,
                  fileSize: real?.fileSize ?? f.fileSize,
                  storagePath: real?.storagePath ?? f.storagePath,
                  checksum: f.checksum,
                  uploadedAt: new Date(),
                };
              }),
            );
            await SubmissionFile.bulkCreate(rows, { transaction });
            fileCount += pkg.files.length;
          }
        }
        filesCreated += fileCount;

        // When a transaction type is pinned, pre-stamp it onto the submission's
        // output so per-type boards and routing reflect it immediately — before the
        // pipeline reaches the `submissionType` stage. The OCR stage merges its
        // block in (it never replaces structured_data), and the `submissionType`
        // stage later confirms the same type from the seeded extract's strong
        // type signal.
        if (pinnedType) {
          await SubmissionOutput.create(
            {
              submissionId: submission.id,
              organizationId,
              structuredData: {
                submissionTypeCode: pinnedType.code,
                submissionTypeLabel: pinnedType.label,
                seededSubmissionType: true,
              },
            } as never,
            { transaction },
          );
        }

        await IngestionEvent.create(
          {
            submissionId: submission.id,
            organizationId: organizationId,
            stage: 'received',
            status: 'submitted',
            metadata: {
              trigger: 'manual-seed',
              archetype: pkg.manifest.archetype,
              lineOfBusiness: pkg.manifest.lineOfBusiness,
              lineOfBusinessCode: pkg.manifest.lineOfBusinessCode,
              lineOfBusinesses: pkg.manifest.lineOfBusinesses,
              lineOfBusinessCodes: pkg.manifest.lineOfBusinessCodes,
              reinsuranceType: pkg.manifest.reinsuranceType,
              cedent: pkg.manifest.cedent,
              cedents: pkg.manifest.cedents,
              broker: pkg.manifest.broker,
              perils: pkg.manifest.perils,
              regions: pkg.manifest.regions,
              currency: pkg.manifest.currency,
              complexity: effectiveComplexity,
              fileCount,
              totalBytes: pkg.manifest.totalBytes,
              categories: pkg.manifest.categories,
              attachmentKinds: pkg.manifest.kinds,
              // --- Pinned transaction type (null/absent = decided by the pipeline) ---
              ...(pinnedType
                ? {
                    submissionTypeCode: pinnedType.code,
                    submissionTypeLabel: pinnedType.label,
                    submissionTypePinned: true,
                  }
                : {}),
              // --- Business scenario classification (the seeding brief) ---
              scenario: scenarioMeta.scenario,
              scenarioLabel: scenarioMeta.scenarioLabel,
              scenarioVariant: scenarioMeta.variant,
              scenarioVariantLabel: scenarioMeta.variantLabel,
              priority: scenarioMeta.priority,
              expectedWorkflowPath: scenarioMeta.expectedWorkflowPath,
              expectedOutcome: scenarioMeta.expectedOutcome,
              underwriterType: scenarioMeta.underwriterType,
              slaClassification: scenarioMeta.slaClassification,
            },
          } as never,
          { transaction },
        );

        submissions.push({
          id: submission.id,
          submissionNumber: num,
          status: submission.status,
          source: submission.source ?? null,
          transport: submission.transport ?? null,
          receivedAt: submission.receivedAt ? new Date(submission.receivedAt).toISOString() : null,
          fileName,
          complexity: effectiveComplexity,
          lineOfBusiness: pkg.manifest.lineOfBusiness,
          lineOfBusinesses: pkg.manifest.lineOfBusinesses,
          cedent: pkg.manifest.cedent,
          fileCount,
          submissionTypeCode: pinnedType?.code ?? null,
          submissionTypeLabel: pinnedType?.label ?? null,
          submissionTypePinned: pinnedType !== null,
          scenario: scenarioMeta.scenario,
          scenarioLabel: scenarioMeta.scenarioLabel,
          scenarioVariant: scenarioMeta.variant,
          priority: scenarioMeta.priority,
          expectedWorkflowPath: scenarioMeta.expectedWorkflowPath,
          expectedOutcome: scenarioMeta.expectedOutcome,
          underwriterType: scenarioMeta.underwriterType,
          slaClassification: scenarioMeta.slaClassification,
        });
      }

      // 5. Subscribe the org to every pipeline stage so the seeded submissions are
      //    visible and can be advanced through each lane. Idempotent: re-enables an
      //    existing subscription rather than duplicating it.
      const subscribedStages: string[] = [];
      if (ensureSubscriptions) {
        for (const stage of PIPELINE_STAGE_CATALOG) {
          const [subscription, created] = await PipelineLifecycleSubscription.findOrCreate({
            where: { organizationId, eventKey: stage.key },
            defaults: {
              organizationId,
              eventKey: stage.key,
              process: stage.key,
              stage: stage.label,
              enabled: true,
            },
            transaction,
          });
          if (!created && !subscription.enabled) {
            await subscription.update({ enabled: true }, { transaction });
          }
          subscribedStages.push(stage.key);
        }
      }

      const stats = summarizeComplexity(submissions.map((s) => s.complexity));
      const scenarioBreakdown: Partial<Record<SubmissionScenarioKey, number>> = {};
      for (const s of submissions) {
        scenarioBreakdown[s.scenario] = (scenarioBreakdown[s.scenario] ?? 0) + 1;
      }
      return {
        organizationId,
        insurerProfileId: insurerProfile.id,
        portfolioId: portfolio.id,
        channelId: channel.id,
        channelLabel: channel.label ?? null,
        submissionsCreated: submissions.length,
        documentsCreated,
        filesCreated,
        averageComplexity: stats.average,
        complexityRange: { min: stats.min, max: stats.max },
        scenarioBreakdown,
        submissionTypeCode: pinnedType?.code ?? null,
        submissionTypeLabel: pinnedType?.label ?? null,
        submissions,
        subscribedStages,
      };
    });

    // Write the real text extracts to disk now that the transaction has committed.
    // Best-effort: a write failure only means OCR reports "unable to read" for
    // that file, not a seed failure.
    await Promise.all(
      pendingFiles.map(async ({ storagePath, content }) => {
        try {
          await fs.mkdir(path.dirname(storagePath), { recursive: true });
          await fs.writeFile(storagePath, content, 'utf8');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `PipelineSubmissionSeedService: failed to write seed document ${storagePath}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }),
    );

    return result;
  }

  /**
   * Simulate a realistic multi-stage pipeline history for the org's existing
   * submissions WITHOUT running any stage service (no OCR/LLM, no cost). For each
   * submission it picks a submission type, walks that type's route, and writes one
   * IngestionEvent per stage up to a random point — so the board fans the cards
   * across lanes and the Pipeline Flow (Sankey) has real stage→stage transitions
   * to draw. Idempotent: by default it first clears prior non-'received' events so
   * repeated calls reset rather than pile up.
   */
  async simulateFlowForOrganization(
    organizationId: number,
    options: { reset?: boolean } = {},
  ): Promise<{
    organizationId: number;
    submissionsAffected: number;
    eventsCreated: number;
    byCurrentStage: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const reset = options.reset !== false;
    const sequelize = getSequelize();

    // The 'received' event (earliest per submission) anchors the history and
    // carries the seeding scenario we map to a submission type.
    const received = await IngestionEvent.findAll({
      where: { organizationId, stage: 'received' },
      order: [['submissionId', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
    });
    const anchors = new Map<number, IngestionEvent>();
    for (const event of received) {
      const sid = event.submissionId;
      if (sid != null && !anchors.has(sid)) anchors.set(sid, event);
    }
    const submissionIds = [...anchors.keys()];

    const byCurrentStage: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let eventsCreated = 0;

    if (submissionIds.length === 0) {
      return { organizationId, submissionsAffected: 0, eventsCreated: 0, byCurrentStage, byType };
    }

    await sequelize.transaction(async (transaction) => {
      if (reset) {
        await IngestionEvent.destroy({
          where: { submissionId: { [Op.in]: submissionIds }, stage: { [Op.ne]: 'received' } },
          transaction,
        });
      }

      for (const submissionId of submissionIds) {
        const anchor = anchors.get(submissionId)!;
        const meta = (anchor.metadata ?? {}) as Record<string, unknown>;
        const type = pickSubmissionType(meta);
        const label = SUBMISSION_TYPE_LABEL.get(type) ?? type;
        const route = routeForType(type).keys; // [ingestion, ocr, submissionType, ...]

        // How far this submission has progressed: at least to OCR (index 1), up to
        // the end of its route. route[2] === 'submissionType' (the fork point).
        const stop = 1 + Math.floor(Math.random() * (route.length - 1));
        const reachedType = stop >= 2;
        const anchorMs = new Date(anchor.createdAt).getTime();
        const stepMs = 3 * 60 * 1000;
        const failedAtEnd = Math.random() < 0.12;

        for (let i = 1; i <= stop; i++) {
          const isLast = i === stop;
          await IngestionEvent.create(
            {
              submissionId,
              organizationId,
              stage: route[i],
              status: isLast && failedAtEnd ? 'failed' : 'completed',
              errorMessage: isLast && failedAtEnd ? `Simulated failure at ${route[i]}.` : null,
              metadata: { trigger: 'flow-simulation', route: type, simulated: true },
              createdAt: new Date(anchorMs + i * stepMs),
            } as never,
            { transaction },
          );
          eventsCreated += 1;
        }

        // Persist the chosen type so the per-type boards (which read
        // structured_data.submissionTypeCode) and the fork stay consistent.
        if (reachedType) {
          let output = await SubmissionOutput.findOne({ where: { submissionId }, order: [['id', 'ASC']], transaction });
          if (!output) {
            output = await SubmissionOutput.create(
              { submissionId, organizationId, structuredData: {} } as never,
              { transaction },
            );
          }
          output.structuredData = {
            ...((output.structuredData as Record<string, unknown> | null) ?? {}),
            submissionTypeCode: type,
            submissionTypeLabel: label,
          };
          await output.save({ transaction });
          byType[type] = (byType[type] ?? 0) + 1;
        }

        const currentStage = route[stop];
        byCurrentStage[currentStage] = (byCurrentStage[currentStage] ?? 0) + 1;
      }
    });

    return { organizationId, submissionsAffected: submissionIds.length, eventsCreated, byCurrentStage, byType };
  }
}
