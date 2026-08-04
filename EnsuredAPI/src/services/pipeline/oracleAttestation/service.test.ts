import { createPipelineTransformationReporter } from '../../../../test/helpers/pipelineTransformations';
import { OracleAttestationService } from './service';

describe('OracleAttestationService', () => {
  const transformations = createPipelineTransformationReporter('oracleAttestation');

  afterAll(async () => {
    await transformations.write();
  });

  test('marks submission ready when trigger and source are compatible', async () => {
    const svc = new OracleAttestationService();
    const payload = {
      extraction: {
        structuredData: {
          riskType: 'hurricane',
          triggerType: 'parametric',
          oracleDataSource: 'NOAA certified_weather_station feed',
        },
      },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'oracle-attestation',
      testName: 'marks submission ready when trigger and source are compatible',
      description: 'Compatible parametric trigger data is transformed into oracle-ready status.',
      before: payload,
      after: result,
    });

    expect(result.ok).toBe(true);
    expect(result.smartContractReady).toBe(true);
  });

  test('blocks non-parametric trigger from automated settlement', async () => {
    const svc = new OracleAttestationService();
    const payload = {
      extraction: {
        structuredData: {
          riskType: 'hurricane',
          triggerType: 'indemnity',
          oracleDataSource: 'NOAA',
        },
      },
    };
    const result = await svc.process(payload);

    transformations.record({
      stage: 'oracle-attestation',
      testName: 'blocks non-parametric trigger from automated settlement',
      description: 'Non-parametric trigger data is transformed into a blocked oracle-attestation decision.',
      before: payload,
      after: result,
    });

    expect(result.smartContractReady).toBe(false);
    expect(String(result.reason)).toMatch(/trigger type/i);
  });
});
