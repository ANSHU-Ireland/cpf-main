import { readdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(packageDir, '../..');
const migrationsPath = path.join(packageDir, 'migrations');
const baselinePath = path.join(
  repoDir,
  'docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql',
);

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the release migration.`);
  return value;
};
const appPassword = required('APP_DB_PASSWORD');
const sslRootCert = process.env.PGSSLROOTCERT?.trim();
const pool = new Pool({
  host: required('MASTER_DB_HOST'),
  port: Number(process.env.MASTER_DB_PORT ?? 5432),
  database: required('MASTER_DB_NAME'),
  user: required('MASTER_DB_USER'),
  password: required('MASTER_DB_PASSWORD'),
  ...(process.env.PGSSL === 'true'
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(sslRootCert ? { ca: readFileSync(sslRootCert, 'utf8') } : {}),
        },
      }
    : {}),
});

const quotedPassword = appPassword.replaceAll("'", "''");
const applicationSchemas = [
  'tenant',
  'iam',
  'assessment',
  'hiring',
  'runtime',
  'evidence',
  'review',
  'governance',
  'integration',
  'audit',
  'support',
];

try {
  const present = await pool.query("SELECT to_regclass('audit.events') IS NOT NULL AS present");
  if (present.rows[0]?.present !== true) {
    await pool.query(await readFile(baselinePath, 'utf8'));
  }
  const migrations = (await readdir(migrationsPath))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  for (const filename of migrations) {
    await pool.query(await readFile(path.join(migrationsPath, filename), 'utf8'));
  }

  await pool.query(`
    DO $role$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_runtime') THEN
        CREATE ROLE cpf_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
      END IF;
    END
    $role$;
    ALTER ROLE cpf_runtime PASSWORD '${quotedPassword}';
    ALTER ROLE cpf_runtime CONNECTION LIMIT 100;
    ALTER ROLE cpf_runtime SET statement_timeout = '30s';
    ALTER ROLE cpf_runtime SET lock_timeout = '5s';
    GRANT cpf_app TO cpf_runtime;
  `);
  for (const schema of applicationSchemas) {
    await pool.query(`
      GRANT USAGE ON SCHEMA ${schema} TO cpf_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO cpf_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO cpf_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cpf_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
        GRANT USAGE, SELECT ON SEQUENCES TO cpf_app;
    `);
  }
  process.stdout.write(
    `Release schema migrated through ${migrations.at(-1) ?? 'baseline'}; cpf_runtime provisioned.\n`,
  );
} finally {
  await pool.end();
}
