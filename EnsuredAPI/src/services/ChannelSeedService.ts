import {
  IngestionChannel,
  InsurerProfile,
  Organization,
  RiskPortfolio,
  Submission,
  SubmissionOutput,
  SubmissionFile,
} from '../db/models';
import { getSequelize } from '../config/database';
import { assignComplexities, buildSubmissionPackage, summarizeComplexity } from './submissionPackages';
import { PIPELINE_STAGE_CATALOG } from '../pipeline/board/service';
import { seedPipelineRunForSubmission, syntheticStageOutputs } from '../pipeline/playback/service';

/**
 * Seeds ingestion channels (one per current channel config) and the submissions
 * each channel produced. Mirrors the channel types/configs the UI offers
 * (see EnsuredUI PipelineIngestion CHANNEL_DEFS). Both active and inactive
 * channels get historical submissions, so "what did this channel produce" is
 * answerable for every channel.
 *
 * Channels are assigned to the insurer organization (via the legacy organizationId
 * column) — that assignment is fixed and submissions inherit it.
 */

interface ChannelBlueprint {
  type: string;
  label: string;
  enabled: boolean;
  status: string;
  meta: string;
  transport: string;
  config: Record<string, unknown>;
  submissionCount: number;
}

const CHANNEL_BLUEPRINTS: ChannelBlueprint[] = [
  { type: 'rabbitmq', label: 'RabbitMQ', enabled: true, status: 'active', meta: 'amqp://localhost:5672', transport: 'amqp', config: { uri: 'amqp://localhost:5672', queueNames: ['ingestion_submissions'] }, submissionCount: 4 },
  { type: 'email-sso', label: 'Email SSO', enabled: true, status: 'active', meta: 'Google Workspace', transport: 'email', config: { provider: 'google', mailbox: 'submissions@cedent.example' }, submissionCount: 3 },
  { type: 'cloud-storage', label: 'Cloud Storage', enabled: false, status: 'idle', meta: '/raw-exposure-data', transport: 's3', config: { provider: 's3', bucket: 'cedent-exposure', rootPath: '/raw-exposure-data' }, submissionCount: 2 },
  { type: 'sftp', label: 'SFTP', enabled: false, status: 'idle', meta: 'sftp.risk-node.io:22', transport: 'sftp', config: { host: 'sftp.risk-node.io', port: 22, rootPath: '/inbound' }, submissionCount: 2 },
  { type: 'webhooks', label: 'Webhooks', enabled: true, status: 'error', meta: 'AUTH: ••••••K892', transport: 'webhook', config: { endpoint: 'https://hooks.ensured.example/ingest' }, submissionCount: 2 },
];

const SUBMISSION_STATUSES = ['submitted', 'modeling', 'priced', 'approved'];

// The furthest pipeline stage a submission of a given status has completed.
// Mirrors the board's status→lane mapping so seeded runs line up with the board.
const STATUS_THROUGH_STAGE: Record<string, string> = {
  modeling: 'validation',
  priced: 'workflow',
  approved: 'workflow',
};

export interface ChannelSeedSummary {
  organizationId: number | null;
  channels: number;
  submissions: number;
  /** Total SubmissionFile rows (attachment packages) created. */
  files: number;
  /** SubmissionOutput rows created for submissions past intake. */
  documents: number;
  /** Completed historical pipeline runs emitted for replay/playback. */
  runs: number;
  /** Mean complexity (1..10) across the seeded submissions — 7 by design. */
  averageComplexity: number;
}

export class ChannelSeedService {
  /**
   * Seed channels + submissions for the most recently created insurer org.
   * No-ops (returns zeros) if no insurer organization exists yet.
   */
  async seed(): Promise<ChannelSeedSummary> {
    const insurerOrg = await Organization.findOne({ where: { type: 'insurer' }, order: [['id', 'DESC']] });
    if (!insurerOrg) {
      return { organizationId: null, channels: 0, submissions: 0, files: 0, documents: 0, runs: 0, averageComplexity: 0 };
    }

    const insurerProfile = await InsurerProfile.findOne({ where: { organizationId: insurerOrg.id }, order: [['id', 'DESC']] });
    const portfolio = insurerProfile
      ? await RiskPortfolio.findOne({ where: { insurerProfileId: insurerProfile.id }, order: [['id', 'DESC']] })
      : null;

    const sequelize = getSequelize();
    const totalSubmissions = CHANNEL_BLUEPRINTS.reduce((sum, b) => sum + b.submissionCount, 0);
    // Per-submission complexity scores with an exact mean of 7 across the batch.
    const complexities = assignComplexities(totalSubmissions, 7);

    return sequelize.transaction(async (transaction) => {
      let channels = 0;
      let submissions = 0;
      let files = 0;
      let documents = 0;
      let runs = 0;
      let counter = 0;
      const usedComplexities: number[] = [];

      for (const blueprint of CHANNEL_BLUEPRINTS) {
        const channel = await IngestionChannel.create(
          {
            organizationId: insurerOrg.id,
            type: blueprint.type,
            label: blueprint.label,
            enabled: blueprint.enabled,
            status: blueprint.status,
            meta: blueprint.meta,
            config: blueprint.config,
          },
          { transaction },
        );
        channels += 1;

        for (let i = 0; i < blueprint.submissionCount; i += 1) {
          const status = SUBMISSION_STATUSES[(counter + 1) % SUBMISSION_STATUSES.length];
          const complexity = complexities[counter] ?? 7;
          counter += 1;
          usedComplexities.push(complexity);

          const submission = await Submission.create(
            {
              insurerProfileId: insurerProfile?.id ?? null,
              portfolioId: portfolio?.id ?? null,
              submittedByUserId: null,
              status,
              organizationId: insurerOrg.id,
              source: blueprint.type,
              transport: blueprint.transport,
              // Spread receivedAt across recent hours for a realistic history.
              receivedAt: new Date(Date.now() - counter * 3 * 60 * 60 * 1000),
              ingestionChannelId: channel.id,
            },
            { transaction },
          );
          submissions += 1;

          // Dress each historical submission with a realistic, archetype-diverse
          // document package (slips, SOVs, loss runs, cat models, site photos, ...)
          // so channel→submission lineage shows believable attachment counts.
          const pkg = buildSubmissionPackage(submission.id, complexity, {
            organizationId: insurerOrg.id,
            submissionId: submission.id,
          });
          if (pkg.files.length > 0) {
            await SubmissionFile.bulkCreate(
              pkg.files.map((f) => ({
                submissionId: submission.id,
                organizationId: insurerOrg.id,
                fileName: f.fileName,
                fileType: f.fileType,
                fileSize: f.fileSize,
                storagePath: f.storagePath,
                checksum: f.checksum,
                uploadedAt: new Date(),
              })),
              { transaction },
            );
            files += pkg.files.length;
          }

          // Submissions that have advanced past intake carry a classified,
          // extracted document summary. SubmissionOutput is upserted by the
          // OCR/classification/extraction stages (keyed by submissionId), so this
          // pre-seed never collides with a later pipeline run.
          if (status !== 'submitted') {
            const structuredData = {
              ocr: { text: pkg.summaryText },
              cedent: pkg.manifest.cedent,
              broker: pkg.manifest.broker,
              lineOfBusiness: pkg.manifest.lineOfBusiness,
              reinsuranceType: pkg.manifest.reinsuranceType,
              perils: pkg.manifest.perils,
              regions: pkg.manifest.regions,
              currency: pkg.manifest.currency,
              complexity,
              fileCount: pkg.manifest.fileCount,
              categories: pkg.manifest.categories,
            };
            await SubmissionOutput.create(
              {
                submissionId: submission.id,
                organizationId: insurerOrg.id,
                documentType: pkg.manifest.lineOfBusinessCode,
                classificationConfidence: 0.9 + (complexity % 10) / 100,
                structuredData,
              } as never,
              { transaction },
            );
            documents += 1;

            // Emit a completed historical pipeline run (stage executions + input/
            // output artifacts) for the stages this submission has already cleared,
            // so the playback timeline has real history to render.
            const throughStage = STATUS_THROUGH_STAGE[status] ?? 'validation';
            const stages = syntheticStageOutputs(
              {
                lineOfBusinessCode: pkg.manifest.lineOfBusinessCode,
                summaryText: pkg.summaryText,
                structuredData,
                throughStageKey: throughStage,
              },
              PIPELINE_STAGE_CATALOG.map((s) => s.key),
            );
            const run = await seedPipelineRunForSubmission(
              {
                submissionId: submission.id,
                organizationId: insurerOrg.id,
                stages,
                baseTime: new Date(Date.now() - counter * 3 * 60 * 60 * 1000),
              },
              transaction,
            );
            if (run) runs += 1;
          }
        }
      }

      const stats = summarizeComplexity(usedComplexities);
      return {
        organizationId: insurerOrg.id,
        channels,
        submissions,
        files,
        documents,
        runs,
        averageComplexity: stats.average,
      };
    });
  }
}
