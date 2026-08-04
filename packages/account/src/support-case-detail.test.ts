import { describe, it, expect } from 'vitest';
import {
  addSupportMessage,
  getSupportCase,
  isSupportCaseId,
  parseSupportMessageCreate,
  parseSupportMessageQuery,
} from './support-case-detail.js';
import type {
  SupportCaseDetailRepository,
  SupportCaseDetailResult,
} from './support-case-detail-repository.js';
import type { SupportMessageCreate, SupportMessageRecord } from './support-message-types.js';
import type { SupportCaseRecord } from './support-case-types.js';
import type { Actor } from './types.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: [] };
const CASE_ID = '11111111-1111-1111-1111-111111111111';

function caseRecord(over: Partial<SupportCaseRecord> = {}): SupportCaseRecord {
  return {
    id: CASE_ID,
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

function messageRecord(over: Partial<SupportMessageRecord> = {}): SupportMessageRecord {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    body: 'Any update?',
    attachments: [],
    createdAt: '2026-01-02T00:00:00.000Z',
    editedAt: null,
    ...over,
  };
}

function repo(
  detail: SupportCaseDetailResult | null,
  added: SupportMessageRecord | null,
  onAdd?: (input: SupportMessageCreate) => void,
): SupportCaseDetailRepository {
  return {
    getCaseDetail: () => Promise.resolve(detail),
    addMessage: (_actor, _caseId, input) => {
      onAdd?.(input);
      return Promise.resolve(added);
    },
  };
}

describe('isSupportCaseId', () => {
  it('accepts a well-formed uuid and rejects other shapes', () => {
    expect(isSupportCaseId(CASE_ID)).toBe(true);
    expect(isSupportCaseId('not-a-uuid')).toBe(false);
    expect(isSupportCaseId('')).toBe(false);
  });
});

describe('parseSupportMessageQuery', () => {
  it('applies defaults when nothing is supplied', () => {
    expect(parseSupportMessageQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseSupportMessageQuery({ limit: '0' }).ok).toBe(false);
    expect(parseSupportMessageQuery({ limit: 101 }).ok).toBe(false);
  });

  it('rejects a malformed cursor', () => {
    expect(parseSupportMessageQuery({ cursor: 'not-base64url-json' }).ok).toBe(false);
  });
});

describe('parseSupportMessageCreate', () => {
  it('accepts a body-only payload', () => {
    expect(parseSupportMessageCreate({ body: 'hi' })).toEqual({ ok: true, value: { body: 'hi' } });
  });

  it('rejects a missing or empty body', () => {
    expect(parseSupportMessageCreate({}).ok).toBe(false);
    expect(parseSupportMessageCreate({ body: '' }).ok).toBe(false);
  });

  it('rejects unknown properties (e.g. attempted visibility escalation)', () => {
    expect(parseSupportMessageCreate({ body: 'hi', visibility: 'internal' }).ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parseSupportMessageCreate(null).ok).toBe(false);
    expect(parseSupportMessageCreate([]).ok).toBe(false);
  });
});

describe('getSupportCase', () => {
  it('projects the case with its message page and omits nextCursor when complete', async () => {
    const result = await getSupportCase(
      {
        repository: repo(
          {
            supportCase: caseRecord(),
            messages: { items: [messageRecord()], total: 1, hasMore: false },
          },
          null,
        ),
      },
      actor,
      CASE_ID,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detail.id).toBe(CASE_ID);
      expect(result.detail.messages).toEqual({
        items: [messageRecord()],
        nextCursor: null,
        total: 1,
      });
    }
  });

  it('emits an opaque nextCursor when more messages remain', async () => {
    const result = await getSupportCase(
      {
        repository: repo(
          {
            supportCase: caseRecord(),
            messages: { items: [messageRecord()], total: 5, hasMore: true },
          },
          null,
        ),
      },
      actor,
      CASE_ID,
      { limit: 1, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detail.messages.nextCursor).toBeTypeOf('string');
    }
  });

  it('returns 404 when the case is missing or not owned', async () => {
    const result = await getSupportCase({ repository: repo(null, null) }, actor, CASE_ID, {
      limit: 25,
      cursor: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without a read permission', async () => {
    const result = await getSupportCase(
      { repository: repo(null, null), permissions: [] },
      actor,
      CASE_ID,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('addSupportMessage', () => {
  it('adds a requester message and returns the stored view', async () => {
    let applied: SupportMessageCreate | undefined;
    const result = await addSupportMessage(
      { repository: repo(null, messageRecord(), (i) => (applied = i)) },
      actor,
      CASE_ID,
      { body: 'Any update?' },
    );
    expect(applied).toEqual({ body: 'Any update?' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.body).toBe('Any update?');
    }
  });

  it('returns 404 when the case is missing or not owned', async () => {
    const result = await addSupportMessage({ repository: repo(null, null) }, actor, CASE_ID, {
      body: 'hi',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it('denies by default (403) without a write permission', async () => {
    const result = await addSupportMessage(
      { repository: repo(null, messageRecord()), permissions: [] },
      actor,
      CASE_ID,
      { body: 'hi' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
