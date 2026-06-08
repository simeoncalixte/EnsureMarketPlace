import { initTestDb } from '../../test/helpers/db';
import jwt from 'jsonwebtoken';
import { buildApp } from '../app';
import fs from 'fs/promises';
import path from 'path';

jest.mock('./connectors/amqp', () => {
  const mockHandlers: Record<string, any> = {};
  const amqp = {
    consumeQueue: jest.fn(async (queue: string, handler: any) => {
      mockHandlers[queue] = handler;
      return { consumerTag: `consumer-${queue}` };
    }),
    publishToQueue: jest.fn(async () => true),
    close: jest.fn(async () => true),
    __getHandler: (queue: string) => mockHandlers[queue],
  } as any;
  return { amqpConnector: amqp };
});

jest.mock('./connectors/ocr', () => ({
  runOcr: jest.fn(async (buffer: Buffer) => ({ text: buffer.toString('utf8') })),
}));

import {
  ExtractedField,
  IngestionChannel,
  IngestionEvent,
  Organization,
  OrganizationPipelineConfig,
  OrganizationPipelineConfigOperation,
  PipelineOperationCatalog,
  Submission,
  SubmissionDocument,
  SubmissionFile,
  TriageResult,
  User,
  WorkflowState,
} from '../db/models';
import { CapacityMatchService } from './capacity/service';
import { ClassificationService } from './classification/service';
import { ExtractionService } from './extraction/service';
import { IngestionService } from './ingestion/service';
import { NormalizationService } from './normalization/service';
import { OcrService } from './ocr/service';
import { persistOcrResult } from './ocr/persistOcrResult';
import { OracleAttestationService } from './oracleAttestation/service';
import { PreRatingService } from './preRating/service';
import { StorageSearchService } from './storageSearch/service';
import { ValidationService } from './validation/service';
import { WorkflowService } from './workflow/service';

jest.setTimeout(30000);

const transformationReportPath = path.join(__dirname, '../../test-results/base-pipeline-transformations.json');
const pipelineTransformations: Array<{
  stage: string;
  description: string;
  before: unknown;
  after: unknown;
  recordedAt: string;
}> = [];

function serializeForReview(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Buffer.isBuffer(value)) {
    return {
      kind: 'Buffer',
      byteLength: value.length,
      utf8Preview: value.toString('utf8', 0, Math.min(value.length, 1000)),
    };
  }

  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeForReview(item, seen));
  if (!value || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  const modelLike = value as { toJSON?: () => unknown };
  if (typeof modelLike.toJSON === 'function') {
    return serializeForReview(modelLike.toJSON(), seen);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key.toLowerCase().includes('password') ? '[redacted]' : serializeForReview(entry, seen),
    ]),
  );
}

function snapshot(value: unknown): unknown {
  return serializeForReview(value);
}

function recordTransformation(stage: string, description: string, before: unknown, after: unknown): void {
  pipelineTransformations.push({
    stage,
    description,
    before: snapshot(before),
    after: snapshot(after),
    recordedAt: new Date().toISOString(),
  });
}

describe('pipeline base lifecycle', () => {
  let org: Organization;
  let initialUser: User;
  let queuedSubmission: Submission;
  let pipelinePayload: Record<string, any>;
  let previousOpenAiApiKey: string | undefined;
  let previousRiskEnrichmentApiUrl: string | undefined;
  let previousOcrApiUrl: string | undefined;

  beforeAll(async () => {
    previousOpenAiApiKey = process.env.OPENAI_API_KEY;
    previousRiskEnrichmentApiUrl = process.env.RISK_ENRICHMENT_API_URL;
    previousOcrApiUrl = process.env.OCR_API_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.RISK_ENRICHMENT_API_URL;
    delete process.env.OCR_API_URL;

    await initTestDb();

    org = await Organization.create({
      name: 'Pipeline Test Org',
      type: 'insurer',
    });

    initialUser = await User.create({
      organizationId: org.id,
      email: 'pipeline.test.user@ensured.local',
      passwordHash: 'test_hash_only',
      role: 'admin',
      firstName: 'Pipeline',
      lastName: 'Tester',
    });
  });

  afterAll(async () => {
    process.env.OPENAI_API_KEY = previousOpenAiApiKey;
    process.env.RISK_ENRICHMENT_API_URL = previousRiskEnrichmentApiUrl;
    process.env.OCR_API_URL = previousOcrApiUrl;

    await fs.mkdir(path.dirname(transformationReportPath), { recursive: true });
    await fs.writeFile(
      transformationReportPath,
      `${JSON.stringify({
        generatedAt: new Date().toISOString(),
        testFile: __filename,
        submissionId: queuedSubmission?.id ?? null,
        transformationCount: pipelineTransformations.length,
        transformations: pipelineTransformations,
      }, null, 2)}\n`,
      'utf8',
    );
  });

  it('creates the initial test user fixture', async () => {
    const found = await User.findOne({ where: { email: 'pipeline.test.user@ensured.local' } });

    expect(found).toBeTruthy();
    expect(found?.id).toBe(initialUser.id);
    expect(found?.organizationId).toBe(initialUser.organizationId);
    expect(found?.isActive).toBe(true);
  });

  it('pairs organization process subscriptions to its submissions using the same user context', async () => {
    const catalogEntries = await Promise.all([
      PipelineOperationCatalog.create({
        operationKey: 'classification',
        stageName: 'classification',
        displayName: 'Classification',
        description: 'Classify documents before extraction.',
        category: 'ingestion',
        defaultOrder: 10,
        defaultEnabled: true,
        canDisable: true,
        configSchemaJson: {},
      }),
      PipelineOperationCatalog.create({
        operationKey: 'validation',
        stageName: 'validation',
        displayName: 'Validation',
        description: 'Validate normalized extraction output.',
        category: 'quality',
        defaultOrder: 20,
        defaultEnabled: true,
        canDisable: true,
        configSchemaJson: {},
      }),
      PipelineOperationCatalog.create({
        operationKey: 'workflow',
        stageName: 'workflow',
        displayName: 'Workflow Routing',
        description: 'Route submission into workflow queues.',
        category: 'orchestration',
        defaultOrder: 30,
        defaultEnabled: true,
        canDisable: true,
        configSchemaJson: {},
      }),
    ]);

    const pipelineConfig = await OrganizationPipelineConfig.create({
      organizationId: org.id,
      name: 'Default Submission Pipeline',
      description: 'Subscribed process set for inbound submissions.',
      status: 'active',
      isDefault: true,
      createdByUserId: initialUser.id,
    });

    await Promise.all([
      OrganizationPipelineConfigOperation.create({
        organizationPipelineConfigId: pipelineConfig.id,
        operationCatalogId: catalogEntries[0].id,
        enabled: true,
        stageOrder: 10,
        required: true,
        failBehavior: 'stop',
        configJson: {},
      }),
      OrganizationPipelineConfigOperation.create({
        organizationPipelineConfigId: pipelineConfig.id,
        operationCatalogId: catalogEntries[1].id,
        enabled: true,
        stageOrder: 20,
        required: true,
        failBehavior: 'stop',
        configJson: {},
      }),
      OrganizationPipelineConfigOperation.create({
        organizationPipelineConfigId: pipelineConfig.id,
        operationCatalogId: catalogEntries[2].id,
        enabled: true,
        stageOrder: 30,
        required: false,
        failBehavior: 'continue',
        configJson: {},
      }),
    ]);

    await Promise.all([
      Submission.create({
        tenantId: org.id,
        submittedByUserId: initialUser.id,
        status: 'submitted',
        source: 'email',
        transport: 'upload',
      }),
      Submission.create({
        tenantId: org.id,
        submittedByUserId: initialUser.id,
        status: 'submitted',
        source: 'sftp',
        transport: 'push',
      }),
    ]);

    const subscribed = await OrganizationPipelineConfigOperation.findAll({
      where: {
        organizationPipelineConfigId: pipelineConfig.id,
        enabled: true,
      },
      include: [{ model: PipelineOperationCatalog, as: 'operationCatalog' }],
      order: [['stageOrder', 'ASC']],
    });

    const operationKeys = subscribed.map((operation) => {
      const catalog = (operation as any).operationCatalog as PipelineOperationCatalog;
      return catalog.operationKey;
    });

    const orgSubmissions = await Submission.findAll({ where: { tenantId: org.id }, order: [['id', 'ASC']] });

    expect(pipelineConfig.createdByUserId).toBe(initialUser.id);
    expect(operationKeys).toEqual(['classification', 'validation', 'workflow']);
    expect(orgSubmissions).toHaveLength(2);
    expect(orgSubmissions.every((submission) => submission.submittedByUserId === initialUser.id)).toBe(true);
  });

  it('get on submission from user available channels', async () => {
    const otherOrg = await Organization.create({
      name: 'Other Pipeline Org',
      type: 'insurer',
    });

    await Promise.all([
      IngestionChannel.create({
        tenantId: org.id,
        type: 'email',
        label: 'Inbound Email',
        enabled: true,
        status: 'active',
        config: { inbox: 'pipeline@ensured.local' },
      }),
      IngestionChannel.create({
        tenantId: org.id,
        type: 'sftp',
        label: 'Partner SFTP',
        enabled: true,
        status: 'active',
        config: { host: 'sftp.ensured.local' },
      }),
      IngestionChannel.create({
        tenantId: otherOrg.id,
        type: 'email',
        label: 'Other Org Email',
        enabled: true,
        status: 'active',
        config: { inbox: 'other@ensured.local' },
      }),
    ]);

    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
    const token = jwt.sign({ userId: initialUser.id }, jwtSecret);

    const app = buildApp();
    await app.ready();

    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/ingestion-channels',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const channels = JSON.parse(res.payload) as Array<{
        type: string;
        label: string;
        organizationId: number | null;
      }>;

      const sortedChannels = [...channels].sort((a, b) => a.label.localeCompare(b.label));
      expect(sortedChannels).toHaveLength(2);
      expect(sortedChannels.map((channel) => channel.type)).toEqual(['email', 'sftp']);
      expect(sortedChannels.map((channel) => channel.label)).toEqual(['Inbound Email', 'Partner SFTP']);
      expect(sortedChannels.every((channel) => channel.organizationId === org.id)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('ingests a submission from the configured rabbit queue with the submitter user context', async () => {
    const amqpModule = require('./connectors/amqp');
    const sourceDocument = [
      'ACORD Statement of Values',
      'Risk Type: Hurricane',
      'Coverage Limit: $3.0M',
      'Deductible: $250,000',
      'Effective Date: 05/01/2026',
      'Expected Yield: 12%',
      'Trigger Type: Parametric',
      'Property Location: 123 Coast Road, Miami, FL',
      'Company Domain: ensured.example.com',
      'Oracle Source: NOAA certified_weather_station feed',
    ].join('\n');

    const channel = await IngestionChannel.create({
      tenantId: org.id,
      type: 'rabbitmq',
      label: 'Rabbit Ingestion',
      enabled: true,
      status: 'active',
      config: {
        host: 'localhost:5672',
        queueNames: ['pipeline-inbound'],
      },
    });

    const ingestionSvc = new IngestionService();
    const channelResults = await ingestionSvc.startAmqpListenerForChannel(channel.id);
    const handler = amqpModule.amqpConnector.__getHandler('pipeline-inbound');

    expect(channelResults).toEqual([{ queue: 'pipeline-inbound', consumerTag: 'consumer-pipeline-inbound' }]);
    expect(typeof handler).toBe('function');

    const queueMessage = {
      submission: {
        tenantId: org.id,
        submittedByUserId: initialUser.id,
      },
      files: [{
        fileName: 'coastal-sov.txt',
        fileType: 'text/plain',
        contentBase64: Buffer.from(sourceDocument, 'utf8').toString('base64'),
      }],
    };

    await handler(JSON.stringify(queueMessage), {});

    queuedSubmission = await Submission.findOne({
      where: { tenantId: org.id, transport: 'amqp' },
      order: [['id', 'DESC']],
    }) as Submission;
    if (!queuedSubmission) {
      throw new Error(`AMQP ingestion did not create a submission: ${JSON.stringify(amqpModule.amqpConnector.publishToQueue.mock.calls)}`);
    }
    pipelinePayload = { submission: queuedSubmission.toJSON() };

    const files = await SubmissionFile.findAll({ where: { submissionId: queuedSubmission.id } });
    const events = await IngestionEvent.findAll({ where: { submissionId: queuedSubmission.id } });

    recordTransformation(
      'queue-ingestion',
      'RabbitMQ channel message is transformed into a persisted Submission with SubmissionFile and IngestionEvent records.',
      { channel: channel.toJSON(), message: queueMessage },
      {
        submission: queuedSubmission.toJSON(),
        files,
        events,
      },
    );

    expect(queuedSubmission).toBeTruthy();
    expect(queuedSubmission.submittedByUserId).toBe(initialUser.id);
    expect(queuedSubmission.source).toBe('rabbitmq');
    expect(queuedSubmission.transport).toBe('amqp');
    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('coastal-sov.txt');
    expect(events.map((event) => event.stage)).toContain('received');
  });

  it('runs the ingestion component against the queued submission files', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new IngestionService().process(pipelinePayload);

    pipelinePayload.ingestion = result;

    recordTransformation(
      'ingestion',
      'Submission file records are resolved into readable file buffers for downstream processing.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('ingestion');
    expect(result.files).toHaveLength(1);
    expect((result.files as Array<{ buffer?: Buffer }>)[0].buffer?.toString('utf8')).toContain('Risk Type: Hurricane');
  });

  it('runs the OCR component and persists extracted text', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new OcrService().process(pipelinePayload, { onSuccess: persistOcrResult });
    const document = await SubmissionDocument.findOne({ where: { submissionId: queuedSubmission.id } });

    pipelinePayload.ocr = result;

    recordTransformation(
      'ocr',
      'OCR converts the ingested source document into text and persists extracted text on SubmissionDocument.',
      before,
      {
        payload: pipelinePayload,
        submissionDocument: document,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('ocr');
    expect(result.text).toContain('Coverage Limit: $3.0M');
    expect((document?.structuredData as any)?.ocr?.text).toContain('Oracle Source: NOAA');
  });

  it('runs the classification component against pending extracted submissions', async () => {
    const before = snapshot({
      pendingClassificationQuery: { tenantId: org.id, limit: 10 },
      payload: pipelinePayload,
    });
    const result = await new ClassificationService().process({ tenantId: org.id, limit: 10 });
    const document = await SubmissionDocument.findOne({ where: { submissionId: queuedSubmission.id } });
    const classification = (result.classifications as Array<Record<string, any>>)
      .find((item) => item.submissionId === queuedSubmission.id);

    pipelinePayload.classification = classification;

    recordTransformation(
      'classification',
      'Pending extracted submission text is classified into line of business and subtype taxonomy fields.',
      before,
      {
        classificationResult: result,
        selectedClassification: classification,
        payload: pipelinePayload,
        submissionDocument: document,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(classification).toMatchObject({
      lineOfBusinessCode: 'catastrophe_property',
      lineOfBusinessSubTypeCode: 'catastrophe_property_windstorm',
    });
    expect(document?.documentType).toBe('catastrophe_property');
    expect(document?.structuredData?.classification).toMatchObject({
      lineOfBusinessLabel: 'Catastrophe Property',
      lineOfBusinessSubTypeLabel: 'Windstorm',
    });
  });

  it('runs the extraction component and persists extracted fields', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new ExtractionService().process(pipelinePayload);
    const extractedFields = await ExtractedField.findAll({
      include: [{ model: SubmissionDocument, as: 'document', where: { submissionId: queuedSubmission.id } }],
    });

    pipelinePayload.extraction = result;

    recordTransformation(
      'extraction',
      'OCR text is transformed into structured risk fields and persisted as ExtractedField rows.',
      before,
      {
        payload: pipelinePayload,
        extractedFields,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('extraction');
    expect(result.structuredData.riskType).toContain('Hurricane');
    expect(result.structuredData.limit).toBe(3_000_000);
    expect(extractedFields.map((field) => field.fieldName)).toEqual(expect.arrayContaining(['riskType', 'limit', 'effectiveDate']));
  });

  it('runs the normalization component over extracted data', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new NormalizationService().process(pipelinePayload);

    pipelinePayload.normalization = result;

    recordTransformation(
      'normalization',
      'Extracted fields are normalized into the canonical field shape used by downstream decisions.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('normalization');
    expect(result.normalized).toMatchObject({
      riskType: 'Hurricane',
      limit: 3_000_000,
      expectedYield: 0.12,
    });
  });

  it('runs the validation component and passes complete queue-ingested data', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new ValidationService().process(pipelinePayload);

    pipelinePayload.validation = result;

    recordTransformation(
      'validation',
      'Normalized submission data is checked for required fields and third-party-style scrub signals.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('validation');
    expect(result.flaggedForMoreInfo).toBe(false);
    expect(result.decision).toBe('PASS');
  });

  it('runs the pre-rating component for the validated submission', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new PreRatingService().process(pipelinePayload);

    pipelinePayload.preRating = result;

    recordTransformation(
      'pre-rating',
      'Validated submission data is scored and assigned a pre-rating grade.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.grade === 'A' || result.grade === 'B').toBe(true);
    expect(Number(result.numericScore)).toBeGreaterThanOrEqual(75);
  });

  it('runs the capacity matching component for the rated submission', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new CapacityMatchService().process(pipelinePayload);

    pipelinePayload.capacityMatch = result;

    recordTransformation(
      'capacity-match',
      'Rated submission is matched against open capacity and routed to a destination queue.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.route).toBe('priority_queue');
    expect(result.hasCapacity).toBe(true);
  });

  it('runs the oracle attestation component for parametric source data', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new OracleAttestationService().process(pipelinePayload);

    pipelinePayload.oracleAttestation = result;

    recordTransformation(
      'oracle-attestation',
      'Parametric trigger and source fields are checked for smart-contract/oracle readiness.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.smartContractReady).toBe(true);
  });

  it('runs the workflow component and persists triage state', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new WorkflowService().process(pipelinePayload);
    const triage = await TriageResult.findOne({ where: { submissionId: queuedSubmission.id } });
    const workflowState = await WorkflowState.findOne({ where: { submissionId: queuedSubmission.id } });

    pipelinePayload.workflow = result;

    recordTransformation(
      'workflow',
      'Decision outputs are transformed into persisted triage and workflow state records.',
      before,
      {
        payload: pipelinePayload,
        triage,
        workflowState,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.decision).toBe('PRIORITY_ROUTE');
    expect(result.queue).toBe('priority_queue');
    expect(triage?.decision).toBe('PRIORITY_ROUTE');
    expect(workflowState?.status).toBe('modeling');
  });

  it('runs the storage search component with the completed pipeline payload', async () => {
    const before = snapshot(pipelinePayload);
    const result = await new StorageSearchService().process(pipelinePayload);

    pipelinePayload.storageSearch = result;

    recordTransformation(
      'storage-search',
      'Final enriched pipeline payload is handed to the storage/search stage.',
      before,
      pipelinePayload,
    );

    expect(result.ok).toBe(true);
    expect(result.service).toBe('storageSearch');
    expect(result.received).toMatchObject({
      submission: { id: queuedSubmission.id },
      workflow: { decision: 'PRIORITY_ROUTE' },
    });
  });
});
