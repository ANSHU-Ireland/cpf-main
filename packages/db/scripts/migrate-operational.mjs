import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsPath = path.join(packageDir, 'migrations');

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('DATABASE_URL is required to apply operational migrations.');
}

const pool = new Pool({ connectionString });
try {
  const migrations = (await readdir(migrationsPath))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  for (const filename of migrations) {
    await pool.query(await readFile(path.join(migrationsPath, filename), 'utf8'));
    process.stdout.write(`Applied operational migration: ${filename}\n`);
  }
} finally {
  await pool.end();
}
