BEGIN;

-- The reviewer assignment queue includes a tenant-scoped evidence count. The application role
-- still relies on RLS and the repository's tenant/attempt predicates; this grant only permits the
-- SELECT needed to evaluate that projection.
GRANT SELECT ON evidence.evidence_objects TO cpf_app;

COMMIT;
