import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getProcessSubscriptions, saveProcessSubscription } from '../../api/pipeline';
import { ToggleSwitch } from '../../xds';
import { colors, withAlpha } from '../../xds/colors';

/**
 * Subscribe/unsubscribe view for pipeline processes (stages).
 *
 * Backed by the existing org-scoped endpoints:
 *   GET  /api/pipeline/processes/subscriptions
 *   POST /api/pipeline/processes/subscriptions  { eventKey, process, stage, enabled }
 *
 * Each pipeline stage is treated as a subscribable process; the lane key is used
 * as the eventKey so the toggle state round-trips. The subscription endpoints
 * require an authenticated org, so when the caller is unauthenticated (e.g.
 * Storybook or a logged-out dev session) we degrade gracefully and show a notice
 * instead of erroring.
 */

export type SubscriptionStage = {
  key: string;
  label: string;
  accent: string;
  background: string;
  border: string;
  description?: string;
};

type SubscriptionRecord = {
  eventKey: string;
  process: string;
  stage: string;
  enabled: boolean;
};

const List = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const Row = styled.div<{ $accent: string }>`
  display: grid;
  grid-template-columns: 0.5rem minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.1)};
  border-left: 4px solid ${({ $accent }) => $accent};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  padding: 1rem;
`;

const RowInfo = styled.div`
  min-width: 0;
`;

const RowLabel = styled.div`
  color: ${colors.onSurfaceStrong};
  font-weight: 800;
`;

const RowDesc = styled.div`
  margin-top: 0.25rem;
  color: ${colors.onSurfaceVariant};
  font-size: 0.82rem;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const ToggleCell = styled.div`
  min-width: 9rem;
  display: flex;
  justify-content: flex-end;
`

const Notice = styled.div`
  border: 1px solid ${withAlpha(colors.primarySoft, 0.08)};
  border-radius: 8px;
  background: ${colors.surfaceLow};
  color: ${colors.onSurfaceVariant};
  padding: 0.85rem 1rem;
  font-size: 0.85rem;
  line-height: 1.5;
`;

const ErrorNotice = styled(Notice)`
  border-color: ${withAlpha(colors.error, 0.25)};
  background: ${withAlpha(colors.error, 0.08)};
  color: ${colors.errorSoft};
`;

export default function PipelineProcessSubscriptions({
  stages,
  onSubscriptionChange,
}: {
  stages: SubscriptionStage[];
  onSubscriptionChange?: () => void;
}): React.JSX.Element {
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setAuthRequired(false);

      try {
        const response = await getProcessSubscriptions();
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setAuthRequired(true);
          }
          return;
        }
        if (!response.ok) {
          throw new Error(response.statusText || `Request failed with ${response.status}`);
        }

        const body = (await response.json()) as { subscriptions?: SubscriptionRecord[] };
        if (cancelled) return;

        const next: Record<string, boolean> = {};
        for (const subscription of body.subscriptions ?? []) {
          next[subscription.eventKey] = subscription.enabled;
        }
        setSubscriptions(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load process subscriptions');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(stage: SubscriptionStage) {
    const eventKey = stage.key;
    const previous = subscriptions[eventKey] ?? false;
    const nextEnabled = !previous;

    setSubscriptions((current) => ({ ...current, [eventKey]: nextEnabled }));
    setPendingKey(eventKey);

    try {
      const response = await saveProcessSubscription({ eventKey, process: stage.key, stage: stage.label, enabled: nextEnabled });

      if (response.status === 401 || response.status === 403) {
        setAuthRequired(true);
        throw new Error('authentication required');
      }
      if (!response.ok) {
        throw new Error(response.statusText || `Request failed with ${response.status}`);
      }

      const body = (await response.json()) as { subscription?: SubscriptionRecord };
      if (body.subscription) {
        setSubscriptions((current) => ({ ...current, [body.subscription!.eventKey]: body.subscription!.enabled }));
      }
      setError(null);
      onSubscriptionChange?.();
    } catch (err) {
      // Revert the optimistic update on failure.
      setSubscriptions((current) => ({ ...current, [eventKey]: previous }));
      if (!(err instanceof Error && err.message === 'authentication required')) {
        setError(err instanceof Error ? err.message : 'Unable to update subscription');
      }
    } finally {
      setPendingKey((current) => (current === eventKey ? null : current));
    }
  }

  return (
    <Stack>
      {authRequired && (
        <Notice>Sign in as a member of an organization to manage pipeline process subscriptions. You can review the available processes below.</Notice>
      )}
      {error && <ErrorNotice>Subscription update failed: {error}</ErrorNotice>}
      {loading && !authRequired && <Notice>Loading current subscriptions…</Notice>}

      <List>
        {stages.map((stage) => {
          const enabled = subscriptions[stage.key] ?? false;
          const pending = pendingKey === stage.key;

          return (
            <Row key={stage.key} $accent={stage.accent}>
              <span aria-hidden />
              <RowInfo>
                <RowLabel>{stage.label}</RowLabel>
                <RowDesc>{stage.description ?? `Notify the organization on ${stage.label} pipeline events.`}</RowDesc>
              </RowInfo>
              <ToggleCell>
                <ToggleSwitch
                  checked={enabled}
                  disabled={pending || authRequired}
                  onChange={() => void toggle(stage)}
                  label={enabled ? 'Subscribed' : 'Subscribe'}
                />
              </ToggleCell>
            </Row>
          );
        })}
      </List>
    </Stack>
  );
}
