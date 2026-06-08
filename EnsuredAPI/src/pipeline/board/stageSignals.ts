/**
 * Scalar result fields worth surfacing in the run log for quick querying/display,
 * without having to fetch and parse the full output artifact. (Array signals like
 * `warnings` are handled separately by the orchestrator.)
 *
 *  - templatePersisted: the schemaGeneration stage wrote/extended the reusable
 *    line-of-business PageTemplate for this submission (see
 *    schemaGeneration/service.ts). Lets the run log show when an AI-generated form
 *    was promoted into the shared template library.
 */
export const STAGE_SIGNAL_KEYS = ['templatePersisted'] as const;

/**
 * Pull the known scalar signals present on a stage result into a flat metadata bag.
 * Only allow-listed keys are projected, so a large field (e.g. the full schema) is
 * never copied into the run-log metadata. Pure.
 */
export function extractStageSignals(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') return {};
  const record = result as Record<string, unknown>;
  const signals: Record<string, unknown> = {};
  for (const key of STAGE_SIGNAL_KEYS) {
    if (key in record) signals[key] = record[key];
  }
  return signals;
}
