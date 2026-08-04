/**
 * Deny-by-default authorization core (Contract §12, invariant §9). Service-layer policy is
 * authoritative; database RLS is defence-in-depth. Access is denied unless an explicit
 * permission grants it AND the tenant boundary (ABAC) is satisfied.
 */

export interface Actor {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  /** Platform staff may cross tenants, but still require an explicit permission (purpose-scoped). */
  readonly isPlatformStaff?: boolean;
}

export interface Resource {
  readonly type: string;
  /** Tenant that owns the resource. */
  readonly tenantId: string;
}

export interface Permission {
  readonly role: string;
  readonly action: string;
  readonly resourceType: string;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

const DENY_CROSS_TENANT: PolicyDecision = {
  allowed: false,
  reason: 'cross-tenant access denied',
};

/**
 * Returns an allow decision only when the actor holds a role permitted to perform `action` on
 * the resource type, and the actor is within the resource's tenant (or is platform staff).
 */
export function can(
  actor: Actor,
  action: string,
  resource: Resource,
  permissions: readonly Permission[],
): PolicyDecision {
  const sameTenant = actor.tenantId === resource.tenantId;
  if (!sameTenant && actor.isPlatformStaff !== true) {
    return DENY_CROSS_TENANT;
  }

  const roles = new Set(actor.roles);
  const granted = permissions.some(
    (p) => roles.has(p.role) && p.action === action && p.resourceType === resource.type,
  );

  if (!granted) {
    return {
      allowed: false,
      reason: `no permission for action '${action}' on '${resource.type}'`,
    };
  }

  return {
    allowed: true,
    reason: sameTenant ? 'permitted within tenant' : 'permitted as platform staff',
  };
}
