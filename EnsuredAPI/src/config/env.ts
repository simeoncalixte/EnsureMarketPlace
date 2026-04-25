import dotenv from 'dotenv';

dotenv.config();

function requireValue(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  dbHost: requireValue(process.env.DB_HOST ?? '127.0.0.1', 'DB_HOST'),
  dbPort: Number(process.env.DB_PORT ?? 5432),
  dbName: requireValue(process.env.DB_NAME ?? 'ensured_marketplace', 'DB_NAME'),
  dbUser: requireValue(process.env.DB_USER ?? 'postgres', 'DB_USER'),
  dbPassword: requireValue(process.env.DB_PASSWORD ?? 'postgres', 'DB_PASSWORD'),
};
