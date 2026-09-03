import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import styled from 'styled-components';
import { getProcessBoard, advanceSubmission, rerunSubmission } from '../../api/pipeline';
import * as S from './InsurerDashboard.styles';
import PipelineIngestion from './PipelineIngestion';
import PipelineProcessSubscriptions from './PipelineProcessSubscriptions';
import { CREATE_COVERAGE_PATH, createDealSubmissionSeed } from './createCoverageNavigation';
import { Badge, Button, MetricCard, type XdsBadgeVariant } from '../../xds';
import { colors, withAlpha } from '../../xds/colors';

/**
 * Pipeline Processes — a read-only Kanban of active submissions positioned by
 * their current stage in the document-ingestion pipeline.
 *
 * Data comes from `GET /api/pipeline/processes/board` (see
 * `EnsuredAPI/src/pipeline/board/service.ts`), which returns lanes (pipeline
 * stages) and items (active submissions). Lanes are system-driven, so the board
 * is intentionally read-only — there is no drag-to-advance here (unlike the
 * underwriting board in IncomingSubmissionsPage).
 *
 * The `boardOverride` / `errorOverride` / `loadingOverride` props let Storybook
 * inject state without a backend (this repo has no MSW).
 */

type PipelineEventStatus = 'ok' | 'processing' | 'failed';
type SubmissionPriority = 'urgent' | 'high' | 'normal';

type BoardStage = {
  key: string;
  label: string;
  accent: string;
  background: string;
  border: string;
  description: string;
  emptyState: string;
};

type BoardItem = {
  id: number;
  stageKey: string;
  stageLabel: string;
  stageAccent: string;
  stageBackground: string;
  stageBorder: string;
  status: string;
  eventStatus: PipelineEventStatus;
  hasError: boolean;
  priority: SubmissionPriority;
  values: Record<string, string | number | null>;
};

type BoardSummaryCard = {
  label: string;
  value: number;
  meta: string;
  format: 'number' | 'currency';
};

type BoardConfig = {
  eyebrow: string;
  title: string;
  description: string;
  stages: BoardStage[];
};

type BoardChannelStats = {
  active: number;
  total: number;
};

export type PipelineBoardResponse = {
  config: BoardConfig;
  /** All pipeline stages (unfiltered) — drives the subscribe view. */
  availableStages?: BoardStage[];
  summary: BoardSummaryCard[];
  channels?: BoardChannelStats;
  items: BoardItem[];
  refreshedAt: string;
};

type PipelineView = 'board' | 'channels' | 'subscriptions';

type PipelineProcessesProps = {
  /** Inject a board response (Storybook / tests) instead of fetching. */
  boardOverride?: PipelineBoardResponse;
  /** Force the error state (Storybook). */
  errorOverride?: string;
  /** Force the loading state (Storybook). */
  loadingOverride?: boolean;
  /** Initial view (Storybook): board | channels | subscriptions. */
  initialView?: PipelineView;
};

const PRIORITY_TONES: Record<SubmissionPriority, { label: string; variant: XdsBadgeVariant }> = {
  urgent: { label: 'Urgent', variant: 'danger' },
  high: { label: 'High', variant: 'warning' },
  normal: { label: 'Normal', variant: 'info' },
};

const EVENT_STATUS_TONES: Record<PipelineEventStatus, { label: string; variant: XdsBadgeVariant }> = {
  failed: { label: 'Failed', variant: 'danger' },
  processing: { label: 'Processing', variant: 'warning' },
  ok: { label: 'On track', variant: 'success' },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatMetric(card: BoardSummaryCard): string {
  if (card.format === 'currency') {
    return formatCurrency(card.value);
  }
  return new Intl.NumberFormat('en-US').format(card.value);
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

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

const BoardGrid = styled.div`
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 1.5rem;
`;

const LaneCard = styled.div<{ $accent: string }>`
  flex: 0 0 20rem;
  display: flex;
  flex-direction: column;
  border-top: 3px solid ${({ $accent }) => $accent};
  border-radius: 10px 10px 0 0;
  padding-top: 0.25rem;
`;

const LaneHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0 1rem;
  padding: 0 0.25rem;
`;

const LaneTitle = styled.div`
  color: ${colors.onSurfaceStrong};
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const LaneCount = styled.span<{ $accent: string; $background: string; $border: string }>`
  min-width: 1.75rem;
  border-radius: 999px;
  background: ${({ $background }) => $background};
  border: 1px solid ${({ $border }) => $border};
  color: ${({ $accent }) => $accent};
  padding: 0.2rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 800;
  text-align: center;
`;

const LaneBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Card = styled.article<{ $accent: string; $error: boolean }>`
  position: relative;
  overflow: hidden;
  padding: 0.95rem;
  border-radius: 10px;
  background: ${colors.surfacePanel};
  border: 1px solid ${({ $error }) => ($error ? withAlpha(colors.error, 0.4) : withAlpha(colors.onSurface, 0.12))};
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${withAlpha(colors.primary, 0.6)};
    outline-offset: 2px;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${({ $accent }) => $accent};
  }

  &:hover {
    border-color: ${withAlpha(colors.primary, 0.5)};
    box-shadow: 0 16px 28px ${withAlpha(colors.scrim, 0.24)};
    transform: translateY(-1px);
  }
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const CardTitle = styled.div`
  color: ${colors.primaryContainer};
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.4;
`;

const CardMeta = styled.div`
  margin-top: 0.15rem;
  color: ${colors.onSurfaceVariant};
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
`;

const CardFacts = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem 0.6rem;
  padding: 0.8rem 0;
  margin: 0.6rem 0 0.5rem;
  border-top: 1px solid ${withAlpha(colors.onSurface, 0.05)};
  border-bottom: 1px solid ${withAlpha(colors.onSurface, 0.05)};
`;

const Fact = styled.div`
  min-width: 0;
`;

const FactLabel = styled.div`
  margin-bottom: 0.2rem;
  color: ${colors.onSurfaceVariant};
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const FactValue = styled.div`
  color: ${colors.onSurfaceStrong};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  color: ${colors.onSurfaceVariant};
  font-size: 0.78rem;
`;

const ErrorLine = styled.div`
  margin-top: 0.5rem;
  color: ${colors.errorSoft};
  font-size: 0.75rem;
  line-height: 1.4;
`;

const ColumnStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const BadgeTitleWrap = styled.span`
  display: inline-flex;
`;

const CardTopText = styled.div`
  min-width: 0;
`;

const NoticeAction = styled.div`
  margin-top: 0.75rem;
`;

const AdvanceButton = styled(Button)`
  margin-top: 0.75rem;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const RerunButton = styled(AdvanceButton)`
  border-color: ${withAlpha(colors.error, 0.4)};
  color: ${colors.errorSoft};
`;

const FinalStageNote = styled.div`
  margin-top: 0.75rem;
  text-align: center;
  color: ${colors.neutral[500]};
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const LaneEmpty = styled.div`
  display: flex;
  min-height: 8rem;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 1rem;
  border: 2px dashed ${withAlpha(colors.onSurface, 0.06)};
  border-radius: 8px;
  color: ${colors.neutral[500]};
  text-align: center;
  font-size: 0.82rem;
`;

const Notice = styled.div`
  border: 1px solid ${withAlpha(colors.primarySoft, 0.08)};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.onSurfaceVariant};
  padding: 1.25rem;
`;

const ErrorNotice = styled(Notice)`
  border-color: ${withAlpha(colors.error, 0.25)};
  color: ${colors.errorSoft};
`;

const GearButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? withAlpha(colors.primary, 0.6) : withAlpha(colors.primarySoft, 0.18))};
  background: ${({ $active }) => ($active ? withAlpha(colors.primary, 0.16) : 'transparent')};
  color: ${({ $active }) => ($active ? colors.primarySoft : colors.onSurfaceVariant)};
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;

  .material-symbols-outlined {
    font-size: 1.15rem;
  }

  &:hover {
    color: ${colors.onSurfaceStrong};
    border-color: ${withAlpha(colors.primary, 0.45)};
  }
`;

const ViewPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BackButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  .material-symbols-outlined {
    font-size: 1rem;
  }
`;

const PanelTitle = styled.div`
  color: ${colors.onSurfaceStrong};
  font-weight: 800;
  font-size: 1rem;
`;

function priorityChip(item: BoardItem): React.JSX.Element | null {
  if (item.priority === 'urgent' || item.priority === 'high') {
    const tone = PRIORITY_TONES[item.priority];
    return <Badge variant={tone.variant}>{tone.label}</Badge>;
  }
  return null;
}

function statusChip(item: BoardItem): React.JSX.Element | null {
  // Surface a chip when the latest pipeline event needs attention or is mid-flight;
  // otherwise defer to a priority chip so cards aren't noisy.
  if (item.eventStatus === 'failed' || item.eventStatus === 'processing') {
    const tone = EVENT_STATUS_TONES[item.eventStatus];
    return <Badge variant={tone.variant} dot>{tone.label}</Badge>;
  }
  return priorityChip(item);
}

export default function PipelineProcesses({ boardOverride, errorOverride, loadingOverride, initialView }: PipelineProcessesProps = {}): React.JSX.Element {
  const [view, setView] = useState<PipelineView>(initialView ?? 'board');
  const isStory = boardOverride !== undefined || errorOverride !== undefined || loadingOverride === true;
  const [fetchedBoard, setFetchedBoard] = useState<PipelineBoardResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [subsDirty, setSubsDirty] = useState(false);
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isStory) {
      return;
    }

    let cancelled = false;

    async function loadBoard() {
      setIsLoading(true);
      setFetchError(null);

      try {
        const response = await getProcessBoard();
        if (!response.ok) {
          throw new Error(response.statusText || `Request failed with ${response.status}`);
        }

        const body = (await response.json()) as PipelineBoardResponse;
        if (!cancelled) {
          setFetchedBoard(body);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchedBoard(null);
          setFetchError(err instanceof Error ? err.message : 'Unable to load the pipeline board');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [isStory, reloadNonce]);

  // After the user changes subscriptions and returns to the board, refetch so
  // newly subscribed/unsubscribed lanes are reflected.
  useEffect(() => {
    if (view === 'board' && subsDirty && !isStory) {
      setSubsDirty(false);
      setReloadNonce((value) => value + 1);
    }
  }, [view, subsDirty, isStory]);

  const board = boardOverride ?? fetchedBoard;
  const error = errorOverride ?? fetchError;
  const loading = loadingOverride ?? (isStory ? false : isLoading);

  const config = board?.config;
  const items = board?.items ?? [];
  const summary = board?.summary ?? [];
  const activeChannels = board?.channels?.active ?? 0;
  const totalChannels = board?.channels?.total ?? 0;

  const itemsByStage = useMemo(() => {
    const map = new Map<string, BoardItem[]>();
    for (const item of items) {
      const lane = map.get(item.stageKey) ?? [];
      lane.push(item);
      map.set(item.stageKey, lane);
    }
    return map;
  }, [items]);

  function refresh() {
    setReloadNonce((value) => value + 1);
  }

  // Full pipeline order (unfiltered) — used to find each card's literal next stage.
  const orderedStageKeys = useMemo(() => (board?.availableStages ?? []).map((stage) => stage.key), [board]);

  function nextStageFor(item: BoardItem): BoardStage | null {
    const index = orderedStageKeys.indexOf(item.stageKey);
    if (index < 0) return null;
    return board?.availableStages?.[index + 1] ?? null;
  }

  async function advance(item: BoardItem) {
    if (isStory) return;
    setAdvancingId(item.id);
    setAdvanceError(null);
    try {
      const response = await advanceSubmission(item.id);
      if (!response.ok) {
        throw new Error(response.statusText || `Request failed with ${response.status}`);
      }
      // Refetch so the card moves to its new lane and reflects the run's status.
      setReloadNonce((value) => value + 1);
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Unable to advance submission');
    } finally {
      setAdvancingId((current) => (current === item.id ? null : current));
    }
  }

  function openSubmission(item: BoardItem) {
    if (isStory) return;
    navigate(CREATE_COVERAGE_PATH, { state: { sourceSubmission: createDealSubmissionSeed(item) } });
  }

  async function rerun(item: BoardItem) {
    if (isStory) return;
    setRerunningId(item.id);
    setAdvanceError(null);
    try {
      const response = await rerunSubmission(item.id);
      if (!response.ok) {
        throw new Error(response.statusText || `Request failed with ${response.status}`);
      }
      // Refetch so the card reflects the re-run's status (cleared error on success).
      setReloadNonce((value) => value + 1);
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Unable to re-run stage');
    } finally {
      setRerunningId((current) => (current === item.id ? null : current));
    }
  }

  return (
    <>
      <S.HeaderRow>
        <div>
          <S.PageTitle>{config?.title ?? 'Pipeline Processes'}</S.PageTitle>
          <S.PageSubtitle>
            {config?.description ?? 'Active submissions across each stage of the ingestion pipeline.'}
          </S.PageSubtitle>
        </div>
        <S.HeaderControls>
          <Badge variant="success" dot>
            {loading ? 'loading' : error ? 'unavailable' : `${items.length} submissions`}
          </Badge>
          <BadgeTitleWrap title={`${activeChannels} of ${totalChannels} ingestion channels active`}>
            <Badge variant={activeChannels > 0 ? 'success' : 'neutral'} dot>
              {loading ? 'loading' : error ? 'unavailable' : `${activeChannels} active channel${activeChannels === 1 ? '' : 's'}`}
            </Badge>
          </BadgeTitleWrap>
          <GearButton
            type="button"
            $active={view === 'channels'}
            onClick={() => setView((current) => (current === 'channels' ? 'board' : 'channels'))}
            title="Configure ingestion channels"
            aria-label="Configure ingestion channels"
            aria-pressed={view === 'channels'}
          >
            <span className="material-symbols-outlined" aria-hidden>settings</span>
          </GearButton>
          <Badge variant="info">
            {config ? `${config.stages.length} stages` : 'pipeline stages'}
          </Badge>
          <GearButton
            type="button"
            $active={view === 'subscriptions'}
            onClick={() => setView((current) => (current === 'subscriptions' ? 'board' : 'subscriptions'))}
            title="Subscribe to pipeline processes"
            aria-label="Subscribe to pipeline processes"
            aria-pressed={view === 'subscriptions'}
          >
            <span className="material-symbols-outlined" aria-hidden>settings</span>
          </GearButton>
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={isStory}>
            Refresh
          </Button>
        </S.HeaderControls>
      </S.HeaderRow>

      <S.ContentArea>
        {view === 'channels' ? (
          <ViewPanel>
            <PanelHeader>
              <BackButton type="button" variant="outline" size="sm" onClick={() => setView('board')}>
                <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
                Board
              </BackButton>
              <PanelTitle>Ingestion channels</PanelTitle>
            </PanelHeader>
            <PipelineIngestion embedded channelsOnly />
          </ViewPanel>
        ) : view === 'subscriptions' ? (
          <ViewPanel>
            <PanelHeader>
              <BackButton type="button" variant="outline" size="sm" onClick={() => setView('board')}>
                <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
                Board
              </BackButton>
              <PanelTitle>Subscribe to pipeline processes</PanelTitle>
            </PanelHeader>
            <PipelineProcessSubscriptions
              stages={board?.availableStages ?? []}
              onSubscriptionChange={() => setSubsDirty(true)}
            />
          </ViewPanel>
        ) : error ? (
          <Notice>
            Pipeline board data could not be loaded because the server could not be reached or returned an error. {error}
          </Notice>
        ) : loading ? (
          <Notice>Connecting to the pipeline board service…</Notice>
        ) : !config ? (
          <Notice>No pipeline board data is available.</Notice>
        ) : (
          <ColumnStack>
            <MetricsGrid>
              {summary.map((card) => (
                <MetricCard key={card.label} label={card.label} value={formatMetric(card)} delta={card.meta} />
              ))}
            </MetricsGrid>

            {advanceError && (
              <ErrorNotice>
                Advance failed: {advanceError}
              </ErrorNotice>
            )}

            {config.stages.length === 0 ? (
              <Notice>
                No pipeline processes are selected for this board. Use the <strong>Stages</strong> gear above to subscribe to the processes you want to monitor.
                <NoticeAction>
                  <Button type="button" variant="outline" size="sm" onClick={() => setView('subscriptions')}>
                    <span className="material-symbols-outlined" aria-hidden>settings</span>
                    Subscribe to processes
                  </Button>
                </NoticeAction>
              </Notice>
            ) : (
            <BoardGrid>
              {config.stages.map((stage) => {
                const laneItems = itemsByStage.get(stage.key) ?? [];

                return (
                  <LaneCard key={stage.key} $accent={stage.accent}>
                    <LaneHeader>
                      <LaneTitle>{stage.label}</LaneTitle>
                      <LaneCount $accent={stage.accent} $background={stage.background} $border={stage.border}>
                        {laneItems.length}
                      </LaneCount>
                    </LaneHeader>

                    <LaneBody>
                      {laneItems.length === 0 ? (
                        <LaneEmpty>{stage.emptyState}</LaneEmpty>
                      ) : (
                        laneItems.map((item) => {
                          const next = nextStageFor(item);
                          return (
                          <Card
                            key={item.id}
                            $accent={item.stageAccent}
                            $error={item.hasError}
                            role="button"
                            tabIndex={0}
                            onClick={() => openSubmission(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openSubmission(item);
                              }
                            }}
                            title={`Open ${formatValue(item.values.submissionNumber)} in Create Coverage`}
                          >
                            <CardTop>
                              <CardTopText>
                                <CardTitle>{formatValue(item.values.submissionNumber)}</CardTitle>
                                <CardMeta>{formatValue(item.values.cedent)}</CardMeta>
                              </CardTopText>
                              {statusChip(item)}
                            </CardTop>

                            <CardFacts>
                              <Fact>
                                <FactLabel>Line of Business</FactLabel>
                                <FactValue>{formatValue(item.values.lineOfBusiness)}</FactValue>
                              </Fact>
                              <Fact>
                                <FactLabel>Region</FactLabel>
                                <FactValue>{formatValue(item.values.region)}</FactValue>
                              </Fact>
                              <Fact>
                                <FactLabel>Source</FactLabel>
                                <FactValue>{formatValue(item.values.source)}</FactValue>
                              </Fact>
                              <Fact>
                                <FactLabel>Files</FactLabel>
                                <FactValue>{formatValue(item.values.fileCount)}</FactValue>
                              </Fact>
                              <Fact>
                                <FactLabel>Last event</FactLabel>
                                <FactValue>{formatValue(item.values.lastEventLabel)}</FactValue>
                              </Fact>
                              <Fact>
                                <FactLabel>Status</FactLabel>
                                <FactValue>{formatValue(item.values.status)}</FactValue>
                              </Fact>
                            </CardFacts>

                            <CardFooter>
                              <span>{formatValue(item.values.owner)}</span>
                              <span>{formatValue(item.values.receivedLabel)}</span>
                            </CardFooter>

                            {item.hasError && item.values.errorMessage ? (
                              <ErrorLine>{formatValue(item.values.errorMessage)}</ErrorLine>
                            ) : null}

                            {item.hasError ? (
                              <RerunButton
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isStory || rerunningId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void rerun(item);
                                }}
                                title={`Re-run the ${item.stageLabel} stage for ${formatValue(item.values.submissionNumber)}`}
                              >
                                {rerunningId === item.id ? 'Re-running…' : `↻ Re-run ${item.stageLabel}`}
                              </RerunButton>
                            ) : null}

                            {next ? (
                              <AdvanceButton
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isStory || advancingId === item.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void advance(item);
                                }}
                                title={`Run the ${next.label} stage for ${formatValue(item.values.submissionNumber)}`}
                              >
                                {advancingId === item.id ? 'Running…' : `▶ Run ${next.label}`}
                              </AdvanceButton>
                            ) : (
                              <FinalStageNote>Final stage</FinalStageNote>
                            )}
                          </Card>
                          );
                        })
                      )}
                    </LaneBody>
                  </LaneCard>
                );
              })}
            </BoardGrid>
            )}
          </ColumnStack>
        )}
      </S.ContentArea>
    </>
  );
}
