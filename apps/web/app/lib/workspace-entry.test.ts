import { describe, expect, it } from 'vitest';
import { passwordChangedEntry, safeWorkspace, securityEntry } from './workspace-entry';

describe('safe workspace continuation', () => {
  it.each(['/candidate', '/review', '/employer', '/audit/evidence'])(
    'retains the known destination %s through a required password change',
    (workspace) => {
      const security = new URL(securityEntry(workspace), 'https://cpf.invalid');
      expect(security.pathname).toBe('/account/security');
      expect(security.searchParams.get('passwordResetRequired')).toBe('true');
      const signIn = new URL(
        passwordChangedEntry(security.searchParams.get('workspace') ?? undefined),
        'https://cpf.invalid',
      );
      expect(signIn.pathname).toBe('/sign-in');
      expect(signIn.searchParams.get('workspace')).toBe(workspace);
    },
  );
  it.each([
    'https://example.invalid',
    '//example.invalid',
    '/employer/../../admin',
    '/employer?next=admin',
    '__proto__',
    '/employer/',
    '',
    null,
    undefined,
  ])('rejects arbitrary redirect hint %s', (value) => {
    expect(safeWorkspace(value)).toBeUndefined();
    expect(securityEntry(value ?? undefined)).toBe('/account/security?passwordResetRequired=true');
    expect(passwordChangedEntry(value ?? undefined)).toBe('/sign-in?passwordChanged=true');
  });
});
