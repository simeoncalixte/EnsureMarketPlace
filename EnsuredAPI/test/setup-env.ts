// Runs in the test worker process via jest's `setupFiles` option —
// BEFORE any module is imported by a test file.
// By setting DB_NAME here, env.ts's dotenv.config() will not override it
// (dotenv does not overwrite already-set environment variables).
process.env.NODE_ENV    = 'test';
process.env.DB_NAME     = 'ensured_marketplace_test';
process.env.DB_HOST     = process.env.DB_HOST     ?? '127.0.0.1';
process.env.DB_PORT     = process.env.DB_PORT     ?? '5432';
process.env.DB_USER     = process.env.DB_USER     ?? 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';

// COST GUARD: the judgment stages (classification, extraction, validation,
// workflow) use a Gemini model as their primary path when GEMINI_API_KEY is set.
// To guarantee the default test run NEVER makes a billable call, blank the key
// (and the OCR high-precision flag) here — so every stage falls back to its free
// heuristic. Setting them to '' (not delete) means env.ts's dotenv.config() won't
// repopulate them from .env. The guarded live suites set RUN_REAL_LLM=1 to keep
// the real key and exercise the model on purpose.
if (process.env.RUN_REAL_LLM !== '1') {
  process.env.GEMINI_API_KEY = '';
  process.env.OCR_HIGH_PRECISION = '';
}
