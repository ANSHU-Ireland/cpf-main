import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(packageDir, 'migrations/20260810_runtime_review_grants.sql');

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('DATABASE_URL is required to apply operational migrations.');
}

const pool = new Pool({ connectionString });
try {
  await pool.query(await readFile(migrationPath, 'utf8'));
  process.stdout.write('Applied operational migration: 20260810_runtime_review_grants\n');
} finally {
  await pool.end();
}
