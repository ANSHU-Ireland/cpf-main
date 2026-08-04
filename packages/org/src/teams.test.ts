import { describe, it, expect } from 'vitest';
import { createTeam, listTeams, parseTeamCreate, parseTeamListQuery } from './teams.js';
import type { TeamRepository, TeamListResult } from './team-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { TeamCreate, TeamRecord } from './team-types.js';
import { encodeCursor } from './cursor.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };

function team(over: Partial<TeamRecord> = {}): TeamRecord {
  return {
    id: 'team-1',
    name: 'Frontend',
    departmentId: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(result: TeamListResult): TeamRepository {
  return {
    listTeams: () => Promise.resolve(result),
    createTeam: (_actor: Actor, input: TeamCreate) =>
      Promise.resolve(team({ name: input.name, departmentId: input.departmentId ?? null })),
  };
}

describe('parseTeamListQuery', () => {
  it('applies the default limit when nothing is supplied', () => {
    expect(parseTeamListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseTeamListQuery({ limit: '0' }).ok).toBe(false);
    expect(parseTeamListQuery({ limit: 101 }).ok).toBe(false);
  });

  it('decodes a valid cursor', () => {
    const cursor = encodeCursor({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    const result = parseTeamListQuery({ cursor });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cursor).toEqual({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    }
  });

  it('rejects a malformed cursor', () => {
    expect(parseTeamListQuery({ cursor: 'not-valid' }).ok).toBe(false);
  });
});

describe('parseTeamCreate', () => {
  it('accepts a valid team with name and departmentId', () => {
    const result = parseTeamCreate({
      name: 'Frontend',
      departmentId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Frontend', departmentId: '11111111-1111-1111-1111-111111111111' },
    });
  });

  it('accepts a team with only name', () => {
    const result = parseTeamCreate({ name: 'Platform' });
    expect(result).toEqual({ ok: true, value: { name: 'Platform' } });
  });

  it('rejects unknown properties', () => {
    const result = parseTeamCreate({ name: 'HR', status: 'inactive' });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parseTeamCreate(null).ok).toBe(false);
    expect(parseTeamCreate('nope').ok).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(parseTeamCreate({ name: '' }).ok).toBe(false);
  });

  it('rejects a non-UUID departmentId', () => {
    expect(parseTeamCreate({ name: 'T', departmentId: 'bad' }).ok).toBe(false);
  });
});

describe('listTeams', () => {
  it('returns a page for an Employer Admin', async () => {
    const items = [team()];
    const result = await listTeams(
      { repository: repo({ items, total: 1, hasMore: false }) },
      admin,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items).toHaveLength(1);
      expect(result.page.total).toBe(1);
      expect(result.page.nextCursor).toBeNull();
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await listTeams(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('createTeam', () => {
  it('creates a team for an Employer Admin', async () => {
    const result = await createTeam(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      admin,
      { name: 'Frontend' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.team.name).toBe('Frontend');
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await createTeam(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
      { name: 'Frontend' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('returns 409 on duplicate name', async () => {
    const dupRepo: TeamRepository = {
      listTeams: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
      createTeam: () => {
        const err = new Error('duplicate') as Error & { code: string };
        err.code = '23505';
        return Promise.reject(err);
      },
    };
    const result = await createTeam({ repository: dupRepo }, admin, { name: 'Frontend' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });
});
