import { QueryInterface } from 'sequelize';
import fs from 'fs';
import path from 'path';

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const sqlPath = path.join(__dirname, 'sql', '20260417000000-create-ingestion-channels-up.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await context.sequelize.query(sql);
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const sqlPath = path.join(__dirname, 'sql', '20260417000000-create-ingestion-channels-down.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await context.sequelize.query(sql);
}
