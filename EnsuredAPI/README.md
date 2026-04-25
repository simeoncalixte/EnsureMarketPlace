# EnsuredAPI

Fastify + Sequelize + TypeScript API template with Jest tests and Postgres managed by Docker Compose.

## Getting started

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Install dependencies with `npm install`.
3. Start Postgres with `npm run db:up`.
4. Run migrations with `npm run migrate`.
5. Start the API with `npm run dev`.

## Available scripts

- `npm run dev` starts the API in watch mode.
- `npm run build` compiles the TypeScript sources.
- `npm start` runs the compiled server.
- `npm test` runs the Jest test suite.
- `npm run migrate` executes Sequelize migrations.
- `npm run db:up` starts the Postgres container.
- `npm run db:down` stops Postgres and removes the data volume.

## Schema coverage

The normalized schema now covers the platform domains below:

- Identity: `organizations`, `users`, `investorProfiles`, `insurerProfiles`, `wallets`, `bankAccounts`, `apiKeys`, `notifications`
- Underwriting: `riskPortfolios`, `submissions`, `modelRuns`, `pricings`, `pricingVersions`, `riskMetrics`
- Legal and capital structure: `spvEntities`, `spvs`, `spvOwnerships`, `deals`, `tranches`, `capitalCommitments`, `collateralAccounts`, `collateralMovements`
- Tokenization and market structure: `tokens`, `tokenHolders`, `tokenTransactions`, `tokenLocks`, `orders`, `trades`, `orderBookSnapshots`
- Risk and payout operations: `events`, `claims`, `payouts`, `investorPayouts`, `ledgerEntries`
- Compliance and audit: `kycRecords`, `accreditationChecks`, `documents`, `auditEvents`, `fees`

The `users` table is also expanded beyond the initial template to include `organizationId`, `passwordHash`, `role`, and `isActive`.
