import { OPERATION_IDS } from '@cpf/contracts';
import { describe, expect, it } from 'vitest';
import { ConcreteDispatcher, isConcreteOperation } from './concrete-dispatch.js';

const actor = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  roles: ['candidate'],
};

describe('concrete OpenAPI dispatch coverage', () => {
  it('classifies every baseline operation as concrete', () => {
    expect(OPERATION_IDS).toHaveLength(244);
    expect(OPERATION_IDS.filter((operationId) => !isConcreteOperation(operationId))).toEqual([]);
  });

  it('does not classify unknown operations as concrete', () => {
    expect(isConcreteOperation('not_an_openapi_operation')).toBe(false);
  });

  it('routes auth operations through their contract handlers and fails closed', async () => {
    const dispatcher = new ConcreteDispatcher({} as never);
    expect((await dispatcher.dispatch('post_auth_login', actor, {}, {}, {}))?.status).toBe(422);
    expect(
      (
        await dispatcher.dispatch(
          'post_auth_login',
          actor,
          {},
          { email: 'person@example.test', password: 'not-a-real-password' },
          {},
        )
      )?.status,
    ).toBe(401);
    expect(
      (await dispatcher.dispatch('post_auth_mfa_methods', actor, {}, { methodType: 'totp' }, {}))
        ?.status,
    ).toBe(503);
  });
});
