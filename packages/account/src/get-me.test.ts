import { describe, it, expect } from 'vitest';
import { getMe } from './get-me.js';
import type { AccountRepository } from './repository.js';
import type { Actor, ProfileData } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

function repo(data: ProfileData): AccountRepository {
  return { findProfileData: () => Promise.resolve(data) };
}

describe('getMe', () => {
  it('returns the profile with tenant role context for an authenticated caller', async () => {
    const result = await getMe(
      {
        repository: repo({
          user: {
            id: 'user-1',
            email: 'a@example.com',
            displayName: 'Ada',
            userType: 'employer_user',
            status: 'active',
          },
          membership: { tenantId: 'tenant-1', status: 'active', roles: ['employer_admin'] },
        }),
      },
      actor,
    );

    expect(result).toEqual({
      ok: true,
      profile: {
        userId: 'user-1',
        email: 'a@example.com',
        displayName: 'Ada',
        userType: 'employer_user',
        status: 'active',
        tenant: { tenantId: 'tenant-1', membershipStatus: 'active', roles: ['employer_admin'] },
      },
    });
  });

  it('returns a null tenant context when the caller has no membership in this tenant', async () => {
    const result = await getMe(
      {
        repository: repo({
          user: {
            id: 'user-1',
            email: null,
            displayName: null,
            userType: 'candidate',
            status: 'active',
          },
          membership: null,
        }),
      },
      actor,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.tenant).toBeNull();
    }
  });

  it('returns 404 when the user record does not exist', async () => {
    const result = await getMe({ repository: repo({ user: null, membership: null }) }, actor);
    expect(result).toEqual({ ok: false, status: 404, reason: 'profile not found' });
  });

  it('denies by default (403) when no permission grants self-profile read', async () => {
    const result = await getMe(
      {
        repository: repo({ user: null, membership: null }),
        permissions: [],
      },
      actor,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
