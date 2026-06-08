/**
 * Shared result contract for pipeline stage services.
 *
 * Every stage's `process()` resolves to a plain record that ALWAYS carries an
 * `ok` boolean and a `service` name. On failure it additionally carries a stable
 * `error` string and `code`, so the HTTP layer, the board orchestrator, and the
 * frontend can all reason about failures uniformly instead of seeing a bare 500
 * from an uncaught throw.
 *
 *   success:  { ok: true,  service, ...stageOutput, warnings? }
 *   failure:  { ok: false, service, error, code, warnings? }
 *
 * Use {@link runStage} to wrap a stage body so any thrown error (e.g. a DB write
 * that fails) is turned into the structured failure shape rather than propagating.
 */

export type StageFailure = {
  ok: false;
  service: string;
  error: string;
  code: string;
};

/** Default machine-readable code for an unexpected stage error. */
export const STAGE_ERROR_CODE = 'STAGE_ERROR';

/** Extract a human-readable message from an unknown thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Build the structured failure result for a stage. */
export function stageFailure(service: string, err: unknown, code: string = STAGE_ERROR_CODE): StageFailure {
  return { ok: false, service, error: errorMessage(err), code };
}

/**
 * Run a stage body and guarantee a structured result. If the body throws, the
 * error is logged and converted to `{ ok: false, service, error, code }` so the
 * caller (route or board advance) always receives a representable failure.
 */
export async function runStage(
  service: string,
  work: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  try {
    return await work();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`pipeline stage "${service}" failed:`, err instanceof Error ? err.stack ?? err.message : err);
    return stageFailure(service, err);
  }
}
