import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getProcessFlow, seedPipelineFlow } from '../../api/pipeline';
import SankeyChart, { type SankeyChartLink, type SankeyChartNode } from '../../xds/components/SankeyChart';
import * as S from './InsurerDashboard.styles';
import { Badge, Button, MetricCard } from '../../xds';
import { colors, withAlpha } from '../../xds/colors';

/**
 * Pipeline Flow — a Sankey of the COMPLETE pipeline. Every submission's stage
 * history (from `GET /api/pipeline/processes/flow`, see
 * `EnsuredAPI/src/pipeline/board/service.ts#buildPipelineFlow`) is aggregated
 * into stage→stage transition counts. Flow width is the number of submissions
 * that made each transition, so the fork by submission type (a claim leaving
 * `submissionType` for `extraction` vs new business leaving for `classification`)
 * is visible at a glance.
 *
 * `flowOverride` / `errorOverride` / `loadingOverride` let Storybook inject state
 * without a backend (this repo has no MSW).
 */

type FlowSummaryCard = { label: string; value: number; meta: string; format: 'number' };
type FlowLegendEntry = { code: string; label: string; color: string };

export type PipelineFlowResponse = {
  config: { eyebrow: string; title: string; description: string };
  nodes: SankeyChartNode[];
  links: SankeyChartLink[];
  legend: FlowLegendEntry[];
  summary: FlowSummaryCard[];
  refreshedAt: string;
};

type PipelineFlowProps = {
  flowOverride?: PipelineFlowResponse;
  errorOverride?: string;
  loadingOverride?: boolean;
};

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ColumnStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ChartPanel = styled.div`
  padding: 1.25rem 1rem;
  border-radius: 12px;
  background: ${colors.surfacePanel};
  border: 1px solid ${withAlpha(colors.white, 0.08)};
  overflow-x: auto;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  padding: 0 0.25rem;
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: ${colors.onSurfaceVariant};
  font-size: 0.78rem;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  flex: 0 0 auto;
`;

const Notice = styled.div`
  border: 1px solid ${withAlpha(colors.primarySoft, 0.08)};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.onSurfaceVariant};
  padding: 1.25rem;
`;

function formatMetric(card: FlowSummaryCard): string {
  return new Intl.NumberFormat('en-US').format(card.value);
}

export default function PipelineFlow({ flowOverride, errorOverride, loadingOverride }: PipelineFlowProps = {}): React.JSX.Element {
  const isStory = flowOverride !== undefined || errorOverride !== undefined || loadingOverride === true;
  const [fetched, setFetched] = useState<PipelineFlowResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);

  useEffect(() => {
    if (isStory) return;
    let cancelled = false;

    async function loadFlow() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await getProcessFlow();
        if (!response.ok) {
          throw new Error(response.statusText || `Request failed with ${response.status}`);
        }
        const body = (await response.json()) as PipelineFlowResponse;
        if (!cancelled) setFetched(body);
      } catch (err) {
        if (!cancelled) {
          setFetched(null);
          setFetchError(err instanceof Error ? err.message : 'Unable to load the pipeline flow');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadFlow();
    return () => {
      cancelled = true;
    };
  }, [isStory, reloadNonce]);

  const flow = flowOverride ?? fetched;
  const error = errorOverride ?? fetchError;
  const loading = loadingOverride ?? (isStory ? false : isLoading);

  const config = flow?.config;
  const summary = flow?.summary ?? [];

  async function simulate() {
    if (isStory) return;
    setSimulating(true);
    setSimulateError(null);
    try {
      const response = await seedPipelineFlow(true);
      if (!response.ok) {
        throw new Error(response.statusText || `Request failed with ${response.status}`);
      }
      setReloadNonce((value) => value + 1);
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : 'Unable to simulate flow');
    } finally {
      setSimulating(false);
    }
  }

  return (
    <>
      <S.HeaderRow>
        <div>
          <S.PageTitle>{config?.title ?? 'Pipeline Flow'}</S.PageTitle>
          <S.PageSubtitle>
            {config?.description ?? 'How submissions flow through the complete pipeline.'}
          </S.PageSubtitle>
        </div>
        <S.HeaderControls>
          <Badge variant="info" dot>
            {loading ? 'loading' : error ? 'unavailable' : `${flow?.nodes.length ?? 0} stages`}
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void simulate()} disabled={isStory || simulating}>
            {simulating ? 'Simulating…' : 'Simulate flow'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadNonce((value) => value + 1)} disabled={isStory}>
            Refresh
          </Button>
        </S.HeaderControls>
      </S.HeaderRow>

      <S.ContentArea>
        {error ? (
          <Notice>
            Pipeline flow data could not be loaded because the server could not be reached or returned an error. {error}
          </Notice>
        ) : loading ? (
          <Notice>Connecting to the pipeline flow service…</Notice>
        ) : !flow ? (
          <Notice>No pipeline flow data is available.</Notice>
        ) : (
          <ColumnStack>
            {simulateError ? <Notice>Simulate failed: {simulateError}</Notice> : null}
            {flow.links.length === 0 ? (
              <Notice>
                No stage transitions yet — submissions appear here once they’ve moved between stages. Use{' '}
                <strong>Simulate flow</strong> above to generate a realistic multi-stage history (no OCR/LLM run), or advance
                submissions from the pipeline board.
              </Notice>
            ) : null}
            <MetricsGrid>
              {summary.map((card) => (
                <MetricCard key={card.label} label={card.label} value={formatMetric(card)} delta={card.meta} />
              ))}
            </MetricsGrid>
            {flow.legend.length > 0 ? (
              <Legend>
                {flow.legend.map((entry) => (
                  <LegendItem key={entry.code}>
                    <Swatch $color={entry.color} />
                    {entry.label}
                  </LegendItem>
                ))}
              </Legend>
            ) : null}
            <ChartPanel>
              <SankeyChart nodes={flow.nodes} links={flow.links} height={Math.max(420, flow.nodes.length * 40)} />
            </ChartPanel>
          </ColumnStack>
        )}
      </S.ContentArea>
    </>
  );
}
