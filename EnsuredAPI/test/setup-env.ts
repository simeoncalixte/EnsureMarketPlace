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
