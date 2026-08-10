import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(packageDir, '../..');
const baselinePath = path.join(
  repoDir,
  'docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql',
);
const seedPath = path.join(packageDir, 'seeds/northstar-demo.sql');

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('DATABASE_URL is required to seed the Northstar demo.');
}

const pool = new Pool({ connectionString });
try {
  const present = await pool.query("SELECT to_regclass('audit.events') IS NOT NULL AS present");
  if (present.rows[0]?.present !== true) {
    await pool.query(await readFile(baselinePath, 'utf8'));
  }
  await pool.query(await readFile(seedPath, 'utf8'));

  const summary = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM runtime.attempts WHERE tenant_id = '11111111-0000-4000-8000-000000000001') AS attempts,
      (SELECT count(*)::int FROM runtime.responses WHERE tenant_id = '11111111-0000-4000-8000-000000000001') AS responses,
      (SELECT count(*)::int FROM review.reviewer_assignments WHERE tenant_id = '11111111-0000-4000-8000-000000000001') AS assignments,
      (SELECT count(*)::int FROM review.criterion_scores WHERE tenant_id = '11111111-0000-4000-8000-000000000001') AS criterion_scores
  `);
  process.stdout.write(`Northstar demo seeded: ${JSON.stringify(summary.rows[0])}\n`);
} finally {
  await pool.end();
}
