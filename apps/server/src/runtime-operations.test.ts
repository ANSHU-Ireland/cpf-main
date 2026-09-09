import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '@cpf/contracts';
import { Router } from './router.js';
import { ADDITIVE_OPERATIONS, RUNTIME_OPERATIONS } from './runtime-operations.js';
import { isConcreteOperation } from './concrete-dispatch.js';
import { authorizeDemoOperation, type DemoSession } from './demo-session.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const operationId = 'get_applications_applicationId_decision_context';
function session(role: string, scopeId = tenantId): DemoSession {
  return {
    actor: { tenantId, userId: 'user-1', roles: [role] },
    scopes: [{ role, scopeType: 'tenant', scopeId }],
  };
}

describe('additive decision context route', () => {
  it('leaves the source baseline unchanged and registers an unambiguous concrete read', () => {
    expect(OPERATIONS).toHaveLength(244);
    expect(RUNTIME_OPERATIONS).toHaveLength(244 + ADDITIVE_OPERATIONS.length);
    expect(new Set(RUNTIME_OPERATIONS.map((op) => op.operationId)).size).toBe(
      RUNTIME_OPERATIONS.length,
    );
    expect(isConcreteOperation(operationId)).toBe(true);
    const router = new Router();
    const path = `/applications/${tenantId}/decision-context`;
    expect(router.match('GET', path)?.route.op.operationId).toBe(operationId);
    expect(router.match('GET', path)?.params['applicationId']).toBe(tenantId);
    expect(router.match('POST', path)).toBeNull();
    expect(router.pathExists(path)).toBe(true);
  });

  it('allows scoped employer readers without giving approvers issuance authority', () => {
    expect(authorizeDemoOperation(session('employer_admin'), operationId, {})).toBe(true);
    expect(authorizeDemoOperation(session('employer_admin_approver'), operationId, {})).toBe(true);
    expect(
      authorizeDemoOperation(
        session('employer_admin_approver'),
        'post_decisions_decisionId_issue',
        {},
      ),
    ).toBe(false);
    expect(
      authorizeDemoOperation(session('employer_admin_approver', 'other-tenant'), operationId, {}),
    ).toBe(false);
    for (const role of ['candidate', 'reviewer', 'support_agent', 'governance_officer']) {
      expect(authorizeDemoOperation(session(role), operationId, {})).toBe(false);
    }
  });
});
