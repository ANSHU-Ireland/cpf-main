import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Pool } from 'pg';

/** Immutable v2.0 PostgreSQL baseline (Contract §8: preserve as immutable, add migrations later). */
const BASELINE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql',
);

/** True when the baseline schema is already present (checks for audit.events). */
export async function baselineApplied(pool: Pool): Promise<boolean> {
  const res = await pool.query<{ present: boolean }>(
    "select to_regclass('audit.events') is not null as present",
  );
  return res.rows[0]?.present === true;
}

/** Applies the v2.0 baseline once. No-op if already present (baseline is not re-runnable). */
export async function ensureBaselineApplied(pool: Pool): Promise<void> {
  if (await baselineApplied(pool)) {
    return;
  }
  const sql = await readFile(BASELINE_PATH, 'utf8');
  await pool.query(sql);
}
