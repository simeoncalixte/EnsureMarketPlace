import { runStage } from '../stageResult';

function toRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function acceptedSourcesForRisk(riskType: string): string[] {
  if (['hurricane', 'flood', 'storm', 'wildfire', 'earthquake', 'wind'].includes(riskType)) {
    return ['certified_weather_station', 'noaa', 'usgs', 'ecmwf', 'weather'];
  }
  if (riskType === 'cyber') {
    return ['soc_feed', 'siem', 'threat_intel_oracle'];
  }
  return ['oracle', 'certified_feed'];
}

export class OracleAttestationService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return runStage('oracleAttestation', () => this.runOracleAttestation(payload));
  }

  private async runOracleAttestation(payload: any): Promise<Record<string, unknown>> {
    const normalization = toRecord(payload?.normalization);
    const extraction = toRecord(payload?.extraction?.structuredData ?? payload?.extraction ?? {});
    const normalized = toRecord(normalization.normalized ?? normalization.data ?? {});

    const riskType = normalizeText(normalized.riskType ?? normalized.perilType ?? extraction.riskType ?? extraction.perilType);
    const triggerType = normalizeText(normalized.triggerType ?? extraction.triggerType ?? 'parametric');
    const oracleSource = normalizeText(normalized.oracleDataSource ?? extraction.oracleDataSource ?? '');

    const acceptedSources = acceptedSourcesForRisk(riskType || 'unknown');
    const sourceCompatible = oracleSource.length > 0 && acceptedSources.some((source) => oracleSource.includes(source));
    const triggerSupportsOracle = triggerType === 'parametric' || triggerType === 'index';
    const smartContractReady = sourceCompatible && triggerSupportsOracle;

    const reason = smartContractReady
      ? 'Submission has an oracle-compatible trigger and certified data source.'
      : !triggerSupportsOracle
        ? 'Trigger type is not oracle-settlement compatible.'
        : 'No compatible oracle data source was found for the risk type.';

    return {
      ok: true,
      service: 'oracleAttestation',
      riskType,
      triggerType,
      oracleSource: oracleSource || null,
      acceptedSources,
      sourceCompatible,
      smartContractReady,
      reason,
    };
  }
}
