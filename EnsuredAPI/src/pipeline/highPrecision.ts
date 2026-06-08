/**
 * Shared "high-precision" opt-in flag for the pipeline.
 *
 * `OCR_HIGH_PRECISION` is a single switch that routes the accuracy-sensitive
 * stages to a paid LLM model instead of the free local heuristic/engine:
 *   - OCR        → Gemini vision (else local Tesseract)
 *   - Classification → Gemini line-of-business agent (else keyword taxonomy)
 *
 * It is OFF by default, so the pipeline never makes a billable call unless the
 * operator explicitly opts in (cost is diverted to the user). A `GEMINI_API_KEY`
 * is additionally required for any high-precision path to actually run.
 */
export function isHighPrecision(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = String(env.OCR_HIGH_PRECISION ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}
