import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';

/** Immutable v2.0 PostgreSQL baseline (Contract §8: preserve as immutable, add migrations later). */
const BASELINE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql',
);
const MIGRATIONS_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const SCHEMA_BOOTSTRAP_LOCK = 2_026_081_600_001;

type Queryable = Pick<Pool | PoolClient, 'query'>;

/** True when the baseline schema is already present (checks for audit.events). */
export async function baselineApplied(database: Queryable): Promise<boolean> {
  const res = await database.query<{ present: boolean }>(
    "select to_regclass('audit.events') is not null as present",
  );
  return res.rows[0]?.present === true;
}

/** Applies every additive migration in deterministic filename order. Migrations are idempotent. */
export async function applyMigrations(database: Queryable): Promise<void> {
  const filenames = (await readdir(MIGRATIONS_PATH))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of filenames) {
    await database.query(await readFile(path.join(MIGRATIONS_PATH, filename), 'utf8'));
  }
}

/** Applies the immutable baseline once and then all additive migrations. */
export async function ensureBaselineApplied(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [SCHEMA_BOOTSTRAP_LOCK]);
    if (!(await baselineApplied(client))) {
      const sql = await readFile(BASELINE_PATH, 'utf8');
      await client.query(sql);
    }
    await applyMigrations(client);
  } finally {
    await client.query('select pg_advisory_unlock($1)', [SCHEMA_BOOTSTRAP_LOCK]).catch(() => {});
    client.release();
  }
}
