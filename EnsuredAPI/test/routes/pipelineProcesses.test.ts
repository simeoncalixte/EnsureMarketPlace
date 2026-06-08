import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { Organization, User } from '../../src/db/models/identity.models';
import { PipelineLifecycleSubscription } from '../../src/db/models/pipelineConfig.models';
import { pipelineProcessesRoute } from '../../src/routes/pipelineProcesses';
import { initTestDb, truncateTables } from '../helpers/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

describe('GET /api/pipeline/processes', () => {
  test('returns pipeline transformation reports with before and after payloads', async () => {
    const reportRoot = await mkdtemp(path.join(os.tmpdir(), 'pipeline-processes-'));
    const reportDir = path.join(reportRoot, 'pipeline-process-transformations');
    const baseReportPath = path.join(reportRoot, 'base-pipeline-transformations.json');
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      path.join(reportDir, 'classification.json'),
      JSON.stringify({
        process: 'classification',
        generatedAt: '2026-05-28T14:27:07.000Z',
        transformationCount: 1,
        transformations: [
          {
            stage: 'classification',
            testName: 'classify submission',
            before: { text: 'Wind submission' },
            after: { lineOfBusinessCode: 'catastrophe_property' },
          },
        ],
      }),
      'utf8',
    );
    await writeFile(
      baseReportPath,
      JSON.stringify({
        generatedAt: '2026-05-28T14:27:07.000Z',
        submissionId: 42,
        transformationCount: 1,
        transformations: [
          {
            stage: 'ingestion',
            before: { status: 'queued' },
            after: { status: 'ingested' },
          },
        ],
      }),
      'utf8',
    );

    const app = Fastify();
    await app.register(pipelineProcessesRoute, {
      prefix: '/api',
      reportDir,
      baseReportPath,
    });

    const res = await app.inject({ method: 'GET', url: '/api/pipeline/processes' });
    await app.close();

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0].process).toBe('classification');
    expect(body.reports[0].transformations[0].before).toEqual({ text: 'Wind submission' });
    expect(body.reports[0].transformations[0].after).toEqual({ lineOfBusinessCode: 'catastrophe_property' });
    expect(body.baseLifecycle.submissionId).toBe(42);
  });
});

describe('pipeline lifecycle event subscriptions', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    await initTestDb();
    app = Fastify();
    await app.register(pipelineProcessesRoute, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('pipelineLifecycleSubscriptions', 'users', 'organizations');
  });

  async function seedUser(email: string, organizationId: number) {
    const user = await User.create({
      email,
      passwordHash: 'test',
      firstName: 'Pipeline',
      lastName: 'Viewer',
      role: 'insurer',
      organizationId,
    });

    return {
      user,
      token: jwt.sign({ userId: user.id }, JWT_SECRET),
    };
  }

  test('toggles a pipeline lifecycle event for the whole organization', async () => {
    const organization = await Organization.create({ name: 'Ensured Underwriting', type: 'insurer' });
    const otherOrganization = await Organization.create({ name: 'Outside Carrier', type: 'insurer' });
    const firstUser = await seedUser('first.pipeline@example.com', organization.id);
    const secondUser = await seedUser('second.pipeline@example.com', organization.id);
    const outsideUser = await seedUser('outside.pipeline@example.com', otherOrganization.id);

    const enableResponse = await app.inject({
      method: 'POST',
      url: '/api/pipeline/processes/subscriptions',
      headers: { Authorization: `Bearer ${firstUser.token}` },
      payload: {
        eventKey: 'classification:classification',
        process: 'classification',
        stage: 'classification',
        enabled: true,
      },
    });

    expect(enableResponse.statusCode).toBe(200);
    expect(JSON.parse(enableResponse.payload)).toEqual({
      subscription: {
        eventKey: 'classification:classification',
        organizationId: organization.id,
        process: 'classification',
        stage: 'classification',
        enabled: true,
      },
    });

    const sharedResponse = await app.inject({
      method: 'GET',
      url: '/api/pipeline/processes/subscriptions',
      headers: { Authorization: `Bearer ${secondUser.token}` },
    });
    expect(sharedResponse.statusCode).toBe(200);
    expect(JSON.parse(sharedResponse.payload).subscriptions).toEqual([
      {
        eventKey: 'classification:classification',
        organizationId: organization.id,
        process: 'classification',
        stage: 'classification',
        enabled: true,
      },
    ]);

    const outsideResponse = await app.inject({
      method: 'GET',
      url: '/api/pipeline/processes/subscriptions',
      headers: { Authorization: `Bearer ${outsideUser.token}` },
    });
    expect(outsideResponse.statusCode).toBe(200);
    expect(JSON.parse(outsideResponse.payload).subscriptions).toEqual([]);

    const disableResponse = await app.inject({
      method: 'POST',
      url: '/api/pipeline/processes/subscriptions',
      headers: { Authorization: `Bearer ${secondUser.token}` },
      payload: {
        eventKey: 'classification:classification',
        process: 'classification',
        stage: 'classification',
        enabled: false,
      },
    });

    expect(disableResponse.statusCode).toBe(200);
    expect(JSON.parse(disableResponse.payload).subscription.enabled).toBe(false);

    const storedSubscriptions = await PipelineLifecycleSubscription.findAll();
    expect(storedSubscriptions).toHaveLength(1);
    expect(storedSubscriptions[0].organizationId).toBe(organization.id);
    expect(storedSubscriptions[0].enabled).toBe(false);
  });
});
