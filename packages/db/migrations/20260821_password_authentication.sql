BEGIN;

CREATE TABLE IF NOT EXISTS iam.password_credentials (
  user_id uuid PRIMARY KEY REFERENCES iam.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  reset_required boolean NOT NULL DEFAULT true,
  password_version integer NOT NULL DEFAULT 1 CHECK (password_version > 0),
  last_rotated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE iam.password_credentials IS
  'Password verifier material. Plaintext passwords and reset tokens must never be stored here.';
COMMENT ON COLUMN iam.password_credentials.reset_required IS
  'True for generated UAT credentials and any administrator-issued temporary password.';

CREATE OR REPLACE FUNCTION iam.login_with_password(
  requested_email text,
  supplied_password text,
  new_session_id uuid,
  new_session_token_hash text,
  new_session_expires_at timestamptz,
  new_device_label text
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  expires_at timestamptz,
  mfa_required boolean,
  password_reset_required boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, iam, public
AS $$
DECLARE
  target_user iam.users%ROWTYPE;
  credential iam.password_credentials%ROWTYPE;
BEGIN
  SELECT app_user.*
    INTO target_user
    FROM iam.users AS app_user
   WHERE lower(app_user.email::text) = lower(requested_email)
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM crypt(supplied_password, gen_salt('bf', 12));
    RETURN;
  END IF;

  SELECT password.*
    INTO credential
    FROM iam.password_credentials AS password
   WHERE password.user_id = target_user.id
   FOR UPDATE;

  IF target_user.status <> 'active'
     OR (target_user.locked_until IS NOT NULL AND target_user.locked_until > now())
     OR credential.user_id IS NULL
     OR (credential.expires_at IS NOT NULL AND credential.expires_at <= now())
     OR crypt(supplied_password, credential.password_hash) <> credential.password_hash THEN
    UPDATE iam.users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE
             WHEN failed_login_count + 1 >= 8 THEN now() + interval '15 minutes'
             ELSE locked_until
           END,
           updated_at = now()
     WHERE id = target_user.id;
    RETURN;
  END IF;

  IF new_session_expires_at <= now() OR new_session_expires_at > now() + interval '24 hours' THEN
    RAISE EXCEPTION 'session expiry is outside the allowed range';
  END IF;

  INSERT INTO iam.user_sessions
    (id, user_id, refresh_token_hash, device_label, created_at, last_seen_at, expires_at)
  VALUES
    (new_session_id, target_user.id, new_session_token_hash,
     left(nullif(new_device_label, ''), 160), now(), now(), new_session_expires_at);

  UPDATE iam.users
     SET failed_login_count = 0,
         locked_until = NULL,
         last_login_at = now(),
         updated_at = now()
   WHERE id = target_user.id;

  INSERT INTO iam.account_security_events (user_id, event_type, outcome, metadata)
  VALUES (target_user.id, 'password_login', 'succeeded',
          jsonb_build_object('sessionId', new_session_id));

  RETURN QUERY SELECT new_session_id, target_user.id, new_session_expires_at,
    target_user.mfa_enforced, credential.reset_required;
END;
$$;

CREATE OR REPLACE FUNCTION iam.change_password(
  target_user_id uuid,
  current_password text,
  replacement_password text,
  require_reset boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, iam, public
AS $$
DECLARE
  credential iam.password_credentials%ROWTYPE;
BEGIN
  SELECT password.*
    INTO credential
    FROM iam.password_credentials AS password
   WHERE password.user_id = target_user_id
   FOR UPDATE;

  IF credential.user_id IS NULL
     OR crypt(current_password, credential.password_hash) <> credential.password_hash THEN
    RETURN false;
  END IF;

  UPDATE iam.password_credentials
     SET password_hash = crypt(replacement_password, gen_salt('bf', 12)),
         reset_required = require_reset,
         password_version = password_version + 1,
         last_rotated_at = now(),
         expires_at = NULL,
         updated_at = now()
   WHERE user_id = target_user_id;

  UPDATE iam.users
     SET password_changed_at = now(), updated_at = now()
   WHERE id = target_user_id;

  UPDATE iam.user_sessions
     SET revoked_at = now(), revocation_reason = 'password_changed'
   WHERE user_id = target_user_id AND revoked_at IS NULL;

  INSERT INTO iam.account_security_events (user_id, event_type, outcome)
  VALUES (target_user_id, 'password_changed', 'succeeded');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION iam.revoke_user_session(
  target_user_id uuid,
  target_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, iam, public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE iam.user_sessions
     SET revoked_at = now(), revocation_reason = 'user_logout'
   WHERE user_id = target_user_id
     AND revoked_at IS NULL
     AND (target_session_id IS NULL OR id = target_session_id);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON TABLE iam.password_credentials FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.login_with_password(text, text, uuid, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.change_password(uuid, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.revoke_user_session(uuid, uuid) FROM PUBLIC;

GRANT SELECT ON iam.password_credentials TO cpf_app;
GRANT EXECUTE ON FUNCTION iam.login_with_password(text, text, uuid, text, timestamptz, text) TO cpf_app;
GRANT EXECUTE ON FUNCTION iam.change_password(uuid, text, text, boolean) TO cpf_app;
GRANT EXECUTE ON FUNCTION iam.revoke_user_session(uuid, uuid) TO cpf_app;

COMMIT;
