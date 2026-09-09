BEGIN;

-- Bearer-session bootstrap happens before app.user_id/app.tenant_id can be set,
-- so ordinary RLS policies must not be bypassed by the runtime login itself.
-- This function exposes only the active identity/scopes for one exact token hash.
CREATE OR REPLACE FUNCTION iam.resolve_bearer_session(p_token_hash text)
RETURNS TABLE (
  user_id uuid,
  tenant_id uuid,
  role_code text,
  scope_type text,
  scope_id uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, iam
AS $$
  SELECT session.user_id,
         membership.tenant_id,
         role.code,
         membership_role.scope_type,
         membership_role.scope_id
    FROM iam.user_sessions AS session
    JOIN iam.users AS app_user ON app_user.id = session.user_id
    JOIN iam.memberships AS membership ON membership.user_id = session.user_id
    JOIN iam.membership_roles AS membership_role
      ON membership_role.membership_id = membership.id
    JOIN iam.roles AS role ON role.id = membership_role.role_id
   WHERE p_token_hash ~ '^[0-9a-f]{64}$'
     AND session.refresh_token_hash = p_token_hash
     AND session.revoked_at IS NULL
     AND session.expires_at > now()
     AND app_user.status = 'active'
     AND membership.status = 'active'
     AND membership.starts_at <= now()
     AND (membership.ends_at IS NULL OR membership.ends_at > now())
     AND (membership_role.expires_at IS NULL OR membership_role.expires_at > now())
   ORDER BY role.code, membership_role.scope_type, membership_role.scope_id;
$$;

REVOKE ALL ON FUNCTION iam.resolve_bearer_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iam.resolve_bearer_session(text) TO cpf_app;

COMMIT;
