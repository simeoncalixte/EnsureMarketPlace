import Fastify from 'fastify';
import { createPipelineTransformationReporter } from '../../../test/helpers/pipelineTransformations';
import { workflowRoute } from './route';

describe('Workflow pipeline routes', () => {
  const transformations = createPipelineTransformationReporter('workflow');
  let app: any;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(workflowRoute, { prefix: '/api' });
    await app.ready();
  });
  afterAll(async () => {
    if (app && typeof app.close === 'function') await app.close();
    await transformations.write();
  });

  test('GET /api/pipeline/workflow/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pipeline/workflow/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok', service: 'workflow' });
  });

  test('POST /api/pipeline/workflow/process returns priority routing decision', async () => {
    const payload = {
      validation: { flaggedForMoreInfo: false, reasons: [] },
      preRating: { grade: 'A', numericScore: 93 },
      oracleAttestation: { smartContractReady: true },
      capacityMatch: { route: 'priority_queue' },
    };

    const res = await app.inject({ method: 'POST', url: '/api/pipeline/workflow/process', payload });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    transformations.record({
      stage: 'workflow',
      testName: 'POST /api/pipeline/workflow/process returns priority routing decision',
      description: 'Validated decision inputs are transformed into a workflow queue and submission status recommendation.',
      before: payload,
      after: body,
    });
    expect(body.ok).toBe(true);
    expect(body.decision).toBe('PRIORITY_ROUTE');
    expect(body.queue).toBe('priority_queue');
  });
});
