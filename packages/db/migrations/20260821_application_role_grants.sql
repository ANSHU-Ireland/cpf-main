BEGIN;

-- Repositories deliberately SET LOCAL ROLE cpf_app before touching tenant data.
-- Keep the application role authoritative so development, UAT and release
-- databases all exercise the same RLS-protected permission boundary.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
    CREATE ROLE cpf_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END $$;

GRANT USAGE ON SCHEMA
  tenant,
  iam,
  assessment,
  hiring,
  runtime,
  evidence,
  review,
  governance,
  integration,
  audit,
  support
TO cpf_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
  tenant,
  iam,
  assessment,
  hiring,
  runtime,
  evidence,
  review,
  governance,
  integration,
  audit,
  support
TO cpf_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA
  tenant,
  iam,
  assessment,
  hiring,
  runtime,
  evidence,
  review,
  governance,
  integration,
  audit,
  support
TO cpf_app;

COMMIT;
