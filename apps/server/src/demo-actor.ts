import type { Actor } from '@cpf/org';

export const NORTHSTAR_DEMO_ACTOR: Actor = {
  tenantId: '11111111-0000-4000-8000-000000000001',
  userId: '11111111-0000-4000-8000-000000000010',
  roles: ['employer_admin'],
};

/** A fixed synthetic identity is available only in explicit local demo mode. */
export function resolveDemoActor(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Actor | null {
  return env['CPF_DEMO_MODE'] === 'true' ? NORTHSTAR_DEMO_ACTOR : null;
}
