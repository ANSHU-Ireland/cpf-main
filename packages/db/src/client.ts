import pg from 'pg';
import type { Pool as PgPool } from 'pg';

const { Pool } = pg;

/** Returns the configured DATABASE_URL, or undefined when DB features should be skipped. */
export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  return url !== undefined && url.length > 0 ? url : undefined;
}

/** True when a database connection string is configured (see EXTERNAL_ACTIONS_REQUIRED EXT-01). */
export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== undefined;
}

/** Creates a connection pool. Throws if DATABASE_URL is not configured. */
export function createPool(): PgPool {
  const connectionString = getDatabaseUrl();
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is not set; cannot create a database pool.');
  }
  return new Pool({ connectionString });
}
