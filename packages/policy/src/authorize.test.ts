import { describe, it, expect } from 'vitest';
import { can, type Actor, type Permission, type Resource } from './index.js';

const TENANT = 'tenant-1';
const OTHER = 'tenant-2';

const reviewer: Actor = { userId: 'u1', tenantId: TENANT, roles: ['reviewer'] };
const staff: Actor = { userId: 'u2', tenantId: TENANT, roles: ['support'], isPlatformStaff: true };

const resource: Resource = { type: 'review', tenantId: TENANT };
const otherResource: Resource = { type: 'review', tenantId: OTHER };

const permissions: Permission[] = [
  { role: 'reviewer', action: 'read', resourceType: 'review' },
  { role: 'support', action: 'read', resourceType: 'review' },
];

describe('can (deny-by-default authorization)', () => {
  it('denies by default when no permission matches the action', () => {
    const d = can(reviewer, 'delete', resource, permissions);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/no permission/);
  });

  it('denies when the resource type does not match any permission', () => {
    const d = can(reviewer, 'read', { type: 'decision', tenantId: TENANT }, permissions);
    expect(d.allowed).toBe(false);
  });

  it('allows a same-tenant actor holding a matching role permission', () => {
    const d = can(reviewer, 'read', resource, permissions);
    expect(d.allowed).toBe(true);
    expect(d.reason).toMatch(/within tenant/);
  });

  it('denies a non-staff actor crossing tenants even with a permission', () => {
    const d = can(reviewer, 'read', otherResource, permissions);
    expect(d).toEqual({ allowed: false, reason: 'cross-tenant access denied' });
  });

  it('allows platform staff to cross tenants when a permission grants it', () => {
    const d = can(staff, 'read', otherResource, permissions);
    expect(d.allowed).toBe(true);
    expect(d.reason).toMatch(/platform staff/);
  });

  it('denies platform staff crossing tenants without a matching permission', () => {
    const d = can(staff, 'delete', otherResource, permissions);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/no permission/);
  });

  it('allows when any of several roles grants the action', () => {
    const multi: Actor = { userId: 'u3', tenantId: TENANT, roles: ['guest', 'reviewer'] };
    expect(can(multi, 'read', resource, permissions).allowed).toBe(true);
  });
});
