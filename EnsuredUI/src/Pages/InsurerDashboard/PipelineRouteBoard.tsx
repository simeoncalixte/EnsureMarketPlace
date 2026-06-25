import React from 'react';
import { useParams } from 'react-router';
import PipelineProcesses from './PipelineProcesses';

/**
 * Per-submission-type pipeline board. Mounted at `/insurer/pipeline/:routeKey`
 * (one nav entry per submission type — see the backend navigation catalog), it
 * is a thin wrapper that hands the `routeKey` to {@link PipelineProcesses}, which
 * fetches the board scoped to that type's route (`?type=<routeKey>`): only that
 * route's lanes, only that type's submissions.
 *
 * `routeKeyOverride` lets Storybook/tests render a specific board without a
 * router in context.
 */
export default function PipelineRouteBoard({ routeKeyOverride }: { routeKeyOverride?: string } = {}): React.JSX.Element {
  const params = useParams<{ routeKey?: string }>();
  const routeKey = routeKeyOverride ?? params.routeKey;
  return <PipelineProcesses routeKey={routeKey} />;
}
