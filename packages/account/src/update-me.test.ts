import { describe, it, expect } from 'vitest';
import { updateMe } from './update-me.js';
import type { AccountRepository } from './repository.js';
import type { Actor, ProfileData, ProfileUpdate } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

const okData: ProfileData = {
  user: {
    id: 'user-1',
    email: 'a@example.com',
    displayName: 'Ada',
    userType: 'employer_user',
    status: 'active',
  },
  membership: { tenantId: 'tenant-1', status: 'active', roles: ['employer_admin'] },
};

function repo(data: ProfileData, spy?: (patch: ProfileUpdate) => void): AccountRepository {
  return {
    findProfileData: () => Promise.resolve(data),
    applyProfileUpdate: (_actor, patch) => {
      spy?.(patch);
      return Promise.resolve(data);
    },
  };
}

describe('updateMe', () => {
  it('applies the patch and returns the updated profile', async () => {
    let seen: ProfileUpdate | undefined;
    const result = await updateMe({ repository: repo(okData, (p) => (seen = p)) }, actor, {
      theme: 'dark',
    });
    expect(seen).toEqual({ theme: 'dark' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.userId).toBe('user-1');
    }
  });

  it('returns 404 when the profile does not exist', async () => {
    const result = await updateMe({ repository: repo({ user: null, membership: null }) }, actor, {
      theme: 'dark',
    });
    expect(result).toEqual({ ok: false, status: 404, reason: 'profile not found' });
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await updateMe({ repository: repo(okData), permissions: [] }, actor, {
      theme: 'dark',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
