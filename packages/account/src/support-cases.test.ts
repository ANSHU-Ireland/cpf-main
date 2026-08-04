import { describe, it, expect } from 'vitest';
import {
  createSupportCase,
  listSupportCases,
  parseSupportCaseCreate,
  parseSupportCaseQuery,
} from './support-cases.js';
import type { SupportCaseRepository } from './support-case-repository.js';
import type { SupportCaseCreate, SupportCaseRecord } from './support-case-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };

function record(over: Partial<SupportCaseRecord> = {}): SupportCaseRecord {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    caseReference: 'SC-ABC',
    category: 'account_access',
    severity: 'medium',
    subject: 'Cannot sign in',
    description: 'MFA loop after reset.',
    purpose: 'Restore account access.',
    status: 'open',
    slaDueAt: null,
    resolution: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    resolvedAt: null,
    ...over,
  };
}

const validBody: SupportCaseCreate = {
  category: 'account_access',
  severity: 'high',
  subject: 'Cannot sign in',
  description: 'MFA loop after reset.',
  purpose: 'Restore account access.',
};

function repo(
  list: { items: SupportCaseRecord[]; total: number; hasMore: boolean },
  created: SupportCaseRecord,
  onCreate?: (input: SupportCaseCreate) => void,
): SupportCaseRepository {
  return {
    listCases: () => Promise.resolve(list),
    createCase: (_actor, input) => {
      onCreate?.(input);
      return Promise.resolve(created);
    },
  };
}

describe('parseSupportCaseQuery', () => {
  it('applies defaults when nothing is supplied', () => {
    expect(parseSupportCaseQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseSupportCaseQuery({ limit: '0' }).ok).toBe(false);
    expect(parseSupportCaseQuery({ limit: 101 }).ok).toBe(false);
  });

  it('rejects a malformed cursor', () => {
    expect(parseSupportCaseQuery({ cursor: 'not-base64url-json' }).ok).toBe(false);
  });
});

describe('parseSupportCaseCreate', () => {
  it('accepts a complete, valid body', () => {
    expect(parseSupportCaseCreate(validBody)).toEqual({ ok: true, value: validBody });
  });

  it('rejects unknown top-level properties', () => {
    expect(parseSupportCaseCreate({ ...validBody, bogus: 1 }).ok).toBe(false);
  });

  it('rejects a missing required field', () => {
    const rest: Record<string, unknown> = { ...validBody };
    delete rest.subject;
    expect(parseSupportCaseCreate(rest).ok).toBe(false);
  });

  it('rejects an invalid severity enum', () => {
    expect(parseSupportCaseCreate({ ...validBody, severity: 'urgent' }).ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parseSupportCaseCreate(null).ok).toBe(false);
    expect(parseSupportCaseCreate([]).ok).toBe(false);
  });
});

describe('listSupportCases', () => {
  it('projects rows and omits nextCursor when there is no more data', async () => {
    const result = await listSupportCases(
      { repository: repo({ items: [record()], total: 1, hasMore: false }, record()) },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result).toEqual({
      ok: true,
      page: { items: [record()], nextCursor: null, total: 1 },
    });
  });

  it('emits an opaque nextCursor when more rows remain', async () => {
    const result = await listSupportCases(
      { repository: repo({ items: [record()], total: 5, hasMore: true }, record()) },
      actor,
      { limit: 1, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.nextCursor).toBeTypeOf('string');
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await listSupportCases(
      { repository: repo({ items: [], total: 0, hasMore: false }, record()), permissions: [] },
      actor,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('createSupportCase', () => {
  it('creates the case and returns the stored view', async () => {
    let applied: SupportCaseCreate | undefined;
    const result = await createSupportCase(
      {
        repository: repo(
          { items: [], total: 0, hasMore: false },
          record({ severity: 'high' }),
          (i) => (applied = i),
        ),
      },
      actor,
      validBody,
    );
    expect(applied).toEqual(validBody);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.supportCase.status).toBe('open');
      expect(result.supportCase.severity).toBe('high');
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await createSupportCase(
      { repository: repo({ items: [], total: 0, hasMore: false }, record()), permissions: [] },
      actor,
      validBody,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
