import { describe, expect, it, vi } from 'vitest';
import {
  authorizeDemoOperation,
  DemoSessionResolver,
  hashDemoToken,
  parseBearerToken,
  type DemoSession,
} from './demo-session.js';

const TENANT_ID = '11111111-0000-4000-8000-000000000001';
const ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';
const ASSIGNMENT_ID = '11111111-0000-4000-8000-000000000321';

function session(role: string, scopeId: string): DemoSession {
  return {
    actor: { tenantId: TENANT_ID, userId: 'user-1', roles: [role] },
    scopes: [
      {
        role,
        scopeType: role.startsWith('employer_admin') ? 'tenant' : 'submission',
        scopeId,
      },
    ],
  };
}

describe('demo bearer sessions', () => {
  it('parses only a single bearer token', () => {
    expect(parseBearerToken('Bearer demo-token')).toBe('demo-token');
    expect(parseBearerToken('bearer demo-token')).toBe('demo-token');
    expect(parseBearerToken('Basic demo-token')).toBeNull();
    expect(parseBearerToken('Bearer two tokens')).toBeNull();
  });

  it('hashes tokens before lookup', () => {
    expect(hashDemoToken('demo-token')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDemoToken('demo-token')).not.toContain('demo-token');
  });

  it('resolves an active identity and its scopes', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          user_id: 'candidate-user',
          tenant_id: TENANT_ID,
          role_code: 'candidate',
          scope_type: 'submission',
          scope_id: ATTEMPT_ID,
        },
      ],
    });
    const resolved = await new DemoSessionResolver({ query } as never).resolve(
      'Bearer candidate-token',
    );
    expect(resolved?.actor).toEqual({
      userId: 'candidate-user',
      tenantId: TENANT_ID,
      roles: ['candidate'],
    });
    expect(query.mock.calls[0]?.[1]).toEqual([hashDemoToken('candidate-token')]);
  });

  it('does not query without a bearer token', async () => {
    const query = vi.fn();
    expect(await new DemoSessionResolver({ query } as never).resolve(undefined)).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});

describe('demo resource authorization', () => {
  it('limits candidates to their attempt', () => {
    const candidate = session('candidate', ATTEMPT_ID);
    expect(
      authorizeDemoOperation(candidate, 'get_attempts_attemptId', { attemptId: ATTEMPT_ID }),
    ).toBe(true);
    expect(
      authorizeDemoOperation(candidate, 'get_attempts_attemptId', { attemptId: ASSIGNMENT_ID }),
    ).toBe(false);
    expect(
      authorizeDemoOperation(candidate, 'get_review_assignments_assignmentId_scorecard', {
        assignmentId: ASSIGNMENT_ID,
      }),
    ).toBe(false);
    expect(
      authorizeDemoOperation(candidate, 'get_applications_applicationId_bookings', {
        applicationId: 'application-1',
      }),
    ).toBe(true);
  });

  it('limits reviewers to their assignment', () => {
    const reviewer = session('reviewer', ASSIGNMENT_ID);
    expect(authorizeDemoOperation(reviewer, 'get_review_assignments', {})).toBe(true);
    expect(
      authorizeDemoOperation(reviewer, 'get_review_assignments_assignmentId_scorecard', {
        assignmentId: ASSIGNMENT_ID,
      }),
    ).toBe(true);
    expect(
      authorizeDemoOperation(reviewer, 'get_attempts_attemptId', { attemptId: ATTEMPT_ID }),
    ).toBe(false);
  });

  it('allows the tenant-scoped employer admin', () => {
    const admin = session('employer_admin', TENANT_ID);
    expect(authorizeDemoOperation(admin, 'get_attempts_attemptId', { attemptId: ATTEMPT_ID })).toBe(
      true,
    );
    expect(
      authorizeDemoOperation(admin, 'get_review_assignments_assignmentId_scorecard', {
        assignmentId: ASSIGNMENT_ID,
      }),
    ).toBe(true);
  });

  it('limits the employer approver role to the approval command', () => {
    const approver = session('employer_admin_approver', TENANT_ID);
    expect(
      authorizeDemoOperation(approver, 'post_decisions_decisionId_approvals', {
        decisionId: 'decision-1',
      }),
    ).toBe(true);
    expect(
      authorizeDemoOperation(approver, 'post_applications_applicationId_decisions', {
        applicationId: 'application-1',
      }),
    ).toBe(false);
    expect(
      authorizeDemoOperation(approver, 'post_decisions_decisionId_issue', {
        decisionId: 'decision-1',
      }),
    ).toBe(false);
  });

  it('allows a support agent to use only the approved admin support-case operations', () => {
    const support = session('support_agent', TENANT_ID);
    expect(authorizeDemoOperation(support, 'get_admin_support_cases', {})).toBe(true);
    expect(authorizeDemoOperation(support, 'put_admin_support_cases_caseId_status', {})).toBe(true);
    expect(authorizeDemoOperation(support, 'get_admin_tenants', {})).toBe(false);
  });

  it('allows a platform-scoped system administrator across admin operations', () => {
    const systemAdmin: DemoSession = {
      actor: { tenantId: TENANT_ID, userId: 'system-admin', roles: ['system_admin'] },
      scopes: [{ role: 'system_admin', scopeType: 'platform', scopeId: TENANT_ID }],
    };
    expect(authorizeDemoOperation(systemAdmin, 'get_admin_tenants', {})).toBe(true);
    expect(authorizeDemoOperation(systemAdmin, 'get_operations_dashboard', {})).toBe(true);
  });
});
