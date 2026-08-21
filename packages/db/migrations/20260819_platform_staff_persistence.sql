BEGIN;

INSERT INTO iam.roles (id, code, name, scope, is_system)
VALUES (gen_random_uuid(), 'platform_staff', 'CPF platform staff', 'platform', true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, scope = EXCLUDED.scope, is_system = true;

GRANT SELECT, INSERT, UPDATE ON iam.staff_invitations TO cpf_app;

-- Membership-role rows do not carry tenant_id, so mutation is exposed through constrained
-- security-definer functions instead of broad table grants to the application role.
CREATE OR REPLACE FUNCTION iam.replace_platform_staff_roles(
  target_tenant_id uuid,
  target_user_id uuid,
  requested_role_codes text[],
  granting_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_membership_id uuid;
  valid_role_count integer;
BEGIN
  IF target_tenant_id IS DISTINCT FROM iam.current_tenant_id() THEN
    RETURN false;
  END IF;

  IF requested_role_codes IS NULL OR cardinality(requested_role_codes) = 0 THEN
    RETURN false;
  END IF;

  SELECT count(DISTINCT role.code)::integer
    INTO valid_role_count
    FROM iam.roles AS role
   WHERE role.scope = 'platform'
     AND role.code = ANY(requested_role_codes);

  IF valid_role_count <> cardinality(requested_role_codes) THEN
    RETURN false;
  END IF;

  SELECT membership.id
    INTO target_membership_id
    FROM iam.memberships AS membership
    JOIN iam.users AS user_record ON user_record.id = membership.user_id
   WHERE membership.tenant_id = target_tenant_id
     AND membership.user_id = target_user_id
     AND membership.status <> 'revoked'
     AND user_record.user_type = 'cpf_staff';

  IF target_membership_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM iam.membership_roles AS membership_role
   USING iam.roles AS role
   WHERE membership_role.membership_id = target_membership_id
     AND membership_role.role_id = role.id
     AND role.scope = 'platform';

  INSERT INTO iam.membership_roles
    (membership_id, role_id, scope_type, scope_id, granted_by)
  SELECT target_membership_id, role.id, 'platform', target_tenant_id, granting_user_id
    FROM iam.roles AS role
   WHERE role.scope = 'platform'
     AND role.code = ANY(requested_role_codes);

  UPDATE iam.memberships
     SET updated_at = now()
   WHERE id = target_membership_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION iam.set_platform_staff_status(
  target_tenant_id uuid,
  target_user_id uuid,
  requested_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF target_tenant_id IS DISTINCT FROM iam.current_tenant_id()
     OR requested_status NOT IN ('active', 'disabled') THEN
    RETURN false;
  END IF;

  UPDATE iam.users AS user_record
     SET status = requested_status, updated_at = now()
   WHERE user_record.id = target_user_id
     AND user_record.user_type = 'cpf_staff'
     AND EXISTS (
       SELECT 1
         FROM iam.memberships AS membership
         JOIN iam.membership_roles AS membership_role
           ON membership_role.membership_id = membership.id
         JOIN iam.roles AS role ON role.id = membership_role.role_id
        WHERE membership.tenant_id = target_tenant_id
          AND membership.user_id = user_record.id
          AND membership.status <> 'revoked'
          AND role.scope = 'platform'
     );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION iam.replace_platform_staff_roles(uuid, uuid, text[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.set_platform_staff_status(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iam.replace_platform_staff_roles(uuid, uuid, text[], uuid) TO cpf_app;
GRANT EXECUTE ON FUNCTION iam.set_platform_staff_status(uuid, uuid, text) TO cpf_app;

COMMIT;
