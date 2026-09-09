import pg from 'pg';
import type { Pool as PgPool } from 'pg';
import { readFileSync } from 'node:fs';

const { Pool } = pg;

/** Returns the configured DATABASE_URL, or undefined when DB features should be skipped. */
export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  return url !== undefined && url.length > 0 ? url : undefined;
}

function isSplitDatabaseConfigPresent(): boolean {
  return Boolean(
    process.env.PGHOST &&
    process.env.PGPORT &&
    process.env.PGDATABASE &&
    process.env.PGUSER &&
    process.env.PGPASSWORD,
  );
}

/** True when a database connection string is configured (see EXTERNAL_ACTIONS_REQUIRED EXT-01). */
export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== undefined || isSplitDatabaseConfigPresent();
}

/** Creates a connection pool. Throws if DATABASE_URL is not configured. */
export function createPool(): PgPool {
  const connectionString = getDatabaseUrl();
  if (connectionString === undefined && !isSplitDatabaseConfigPresent()) {
    throw new Error('DATABASE_URL is not set; cannot create a database pool.');
  }
  const sslEnabled = process.env.PGSSL === 'true';
  const caPath = process.env.PGSSLROOTCERT?.trim();
  const ssl = sslEnabled
    ? {
        rejectUnauthorized: true,
        ...(caPath === undefined || caPath === ''
          ? {}
          : { ca: readFileSync(caPath, { encoding: 'utf8' }) }),
      }
    : undefined;
  const max = Math.max(2, Math.min(50, Number(process.env.PGPOOL_MAX ?? 10)));
  return new Pool({
    ...(connectionString === undefined
      ? {
          host: process.env.PGHOST,
          port: Number(process.env.PGPORT),
          database: process.env.PGDATABASE,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
        }
      : { connectionString }),
    ...(ssl === undefined ? {} : { ssl }),
    max,
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS ?? 5_000),
    idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS ?? 30_000),
    application_name: process.env.PGAPPNAME ?? 'cpf',
  });
}
