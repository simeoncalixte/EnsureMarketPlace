-- Also safe to run against an existing marketplace volume.
SELECT 'CREATE DATABASE ensured_identity'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ensured_identity')
\gexec
SELECT 'CREATE DATABASE ensured_kyc'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ensured_kyc')
\gexec
