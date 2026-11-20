/** Disposable PostgreSQL + actual feedback HTTP service, no application data. */
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'EnsuredAPI/package.json'));
const feedbackRequire = createRequire(path.join(root, 'EnsuredSubmissionFeedback/package.json'));
const password = randomBytes(24).toString('hex');
const project = `submission-revision-${randomBytes(6).toString('hex')}`;
const compose = ['compose', '-p', project, '-f', path.join(root, 'docker-compose.api-test.yml')];
function docker(args) {
  const result = spawnSync('docker', [...compose, ...args], {
    encoding: 'utf8',
    env: { ...process.env, API_TEST_PASSWORD: password },
  });
  if (result.status !== 0) throw new Error(result.stderr || 'Docker command failed');
  return result.stdout;
}
async function run() {
  let db, pool, app;
  try {
    docker(['up', '-d', '--wait', '--wait-timeout', '60']);
    const port = Number(docker(['port', 'postgres', '5432']).trim().split(':').at(-1));
    Object.assign(process.env, {
      DB_HOST: '127.0.0.1',
      DB_PORT: String(port),
      DB_USER: 'postgres',
      DB_PASSWORD: password,
      DB_NAME: 'ensured_marketplace_test',
      SUBMISSION_FEEDBACK_TOKEN: randomBytes(32).toString('hex'),
    });
    const { getSequelize } = apiRequire('@simeoncalixte/ensured-pipeline-shared/config/database');
    const { currentSubmissionData } = apiRequire(
      '@simeoncalixte/ensured-pipeline-shared/pipeline/submissionData',
    );
    const { Organization, User, Submission, PipelineArtifact, StageExecution } = apiRequire(
      '@simeoncalixte/ensured-pipeline-shared/db/models',
    );
    db = getSequelize();
    await db.sync({ force: true });
    assert.equal(db.models.CanonicalSubmission, undefined);
    await db.query('CREATE DATABASE feedback_revision_test');
    const { Pool } = feedbackRequire('pg');
    pool = new Pool({
      host: '127.0.0.1',
      port,
      user: 'postgres',
      password,
      database: 'feedback_revision_test',
    });
    const { migrate } = feedbackRequire('./src/migrate');
    const { VersionStore } = feedbackRequire('./src/store');
    const { createApp } = feedbackRequire('./src/app');
    await migrate(pool);
    const feedbackTests = spawnSync(
      'npm',
      ['--prefix', path.join(root, 'EnsuredSubmissionFeedback'), 'test'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          FEEDBACK_TEST_DATABASE_URL: `postgres://postgres:${password}@127.0.0.1:${port}/feedback_revision_test`,
        },
      },
    );
    if (feedbackTests.status !== 0) throw new Error(feedbackTests.stdout + feedbackTests.stderr);

    const store = new VersionStore(pool);
    app = createApp({ store, token: process.env.SUBMISSION_FEEDBACK_TOKEN });
    process.env.SUBMISSION_FEEDBACK_URL = await app.listen({ port: 0, host: '127.0.0.1' });
    const organization = await Organization.create({
      name: 'Synthetic revision insurer',
      type: 'insurer',
    });
    const user = await User.create({
      email: 'revision@example.test',
      passwordHash: 'fixture',
      firstName: 'Synthetic',
      lastName: 'Reviewer',
      organizationId: organization.id,
      role: 'analyst',
    });
    // Manual input must reach the real feedback service without creating pipeline evidence.
    apiRequire('ts-node').register({
      transpileOnly: true,
      project: path.join(root, 'EnsuredAPI/tsconfig.json'),
    });
    const { verifySubmissionVersionJourney } = apiRequire(
      './test/submissions/integration/versionHistory.journey',
    );
    await verifySubmissionVersionJourney(db, user);

    const submission = await Submission.create({
      tenantId: organization.id,
      submittedByUserId: user.id,
      status: 'submitted',
    });
    await PipelineArtifact.create({
      submissionId: submission.id,
      tenantId: organization.id,
      stageKey: 'normalization',
      role: 'output',
      payload: { ok: true, data: { 'financials.tiv': 999999 } },
      runId: null,
      contentHash: null,
      mediaType: 'application/json',
      sizeBytes: null,
    });
    const sections = {
      financials: [{ fieldId: 'totalInsuredValue', fieldType: 'number', value: 100 }],
    };
    const artifact = await PipelineArtifact.create({
      submissionId: submission.id,
      tenantId: organization.id,
      stageKey: 'schemaGeneration',
      role: 'output',
      payload: { ok: true, sections },
      runId: null,
      contentHash: null,
      mediaType: 'application/json',
      sizeBytes: null,
    });
    const execution = await StageExecution.create({
      submissionId: submission.id,
      tenantId: organization.id,
      stageKey: 'schemaGeneration',
      status: 'completed',
      outputArtifactId: artifact.id,
      runId: null,
    });
    const baseline = { ok: true, executionId: execution.id, sections };
    const context = { tenantKey: `org:${organization.id}`, actorId: user.id };
    const begin = { baseline, expectedVersion: 0, baseExecutionId: execution.id, action: 'begin' };
    await store.save(submission.id, context, begin);
    const first = await currentSubmissionData(submission);
    assert.equal(first.source.version, 1);
    assert.equal(first.data['financials.totalInsuredValue'], 100);
    assert.equal(first.data['financials.tiv'], undefined);
    await store.save(submission.id, context, {
      ...begin,
      expectedVersion: 1,
      action: 'feedback',
      change: {
        section: 'financials',
        path: [0],
        fieldId: 'totalInsuredValue',
        vote: 'down',
        note: 'Corrected value',
        value: 250,
      },
    });
    const changed = await currentSubmissionData(submission);
    assert.equal(changed.source.version, 2);
    assert.equal(changed.data['financials.totalInsuredValue'], 250);
    assert.notEqual(changed.source.contentHash, first.source.contentHash);
    await store.save(submission.id, context, {
      ...begin,
      expectedVersion: 2,
      action: 'restore',
      restoreVersion: 1,
      note: 'Restore original reviewed inputs',
    });
    const restored = await currentSubmissionData(submission);
    assert.equal(restored.source.version, 3);
    assert.equal(restored.data['financials.totalInsuredValue'], 100);
    assert.notEqual(restored.source.contentHash, first.source.contentHash);
    await assert.rejects(
      () =>
        pool.query('UPDATE submission_feedback.versions SET snapshot=$1 WHERE submission_id=$2', [
          '{}',
          submission.id,
        ]),
      /append-only/,
    );
    await assert.rejects(
      () => store.workbench(submission.id, 'org:999999', null),
      /schema_generation_output_not_found/,
    );
    await app.close();
    app = null;
    await assert.rejects(() => currentSubmissionData(submission));
    console.log(
      JSON.stringify({
        passed: true,
        feedbackTestSummary: feedbackTests.stdout
          .split('\n')
          .filter((line) => /\b(tests|pass|fail|skipped) \d/.test(line)),
        checks: [
          'feedback full suite with real durable history',
          'manual API creation/read/edit/restore with zero pipeline evidence',
          'model removed',
          'separate API and feedback databases',
          'actual authenticated HTTP revision read',
          'edited financial inputs',
          'no stale normalization fallback',
          'restore creates new revision/hash',
          'append-only history',
          'tenant isolation',
          'outage fails closed',
        ],
      }),
    );
  } finally {
    await app?.close();
    await pool?.end();
    await db?.close();
    docker(['down', '--volumes', '--remove-orphans']);
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
