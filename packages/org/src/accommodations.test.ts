import { describe, it, expect } from 'vitest';
import {
  listAccommodations,
  createAccommodation,
  updateAccommodationStatus,
  parseAccommodationCreate,
  parseAccommodationStatusUpdate,
  parseAccommodationId,
} from './accommodations.js';
import type {
  AccommodationRepository,
  AccommodationListResult,
} from './accommodation-repository.js';
import type {
  AccommodationCreate,
  AccommodationRecord,
  AccommodationStatusUpdate,
} from './accommodation-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const APP_ID = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}

const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

function accommodation(overrides: Partial<AccommodationRecord> = {}): AccommodationRecord {
  return {
    id: 'acc-1',
    applicationId: APP_ID,
    requestSummary: 'Need extra time',
    operationalAdjustments: {},
    status: 'requested',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function repo(overrides: Partial<AccommodationRepository> = {}): AccommodationRepository {
  const listResult: AccommodationListResult = { items: [accommodation()], total: 1 };
  return {
    listAccommodations: () => Promise.resolve(listResult),
    createAccommodation: (_a: Actor, _appId: string, input: AccommodationCreate) =>
      Promise.resolve(accommodation({ requestSummary: input.requestSummary })),
    updateAccommodationStatus: (_a: Actor, _id: string, input: AccommodationStatusUpdate) =>
      Promise.resolve(accommodation({ status: input.status })),
    ...overrides,
  };
}

describe('parseAccommodationCreate', () => {
  it('accepts valid', () => {
    expect(parseAccommodationCreate({ requestSummary: 'test' }).ok).toBe(true);
  });
  it('rejects empty', () => {
    expect(parseAccommodationCreate({}).ok).toBe(false);
  });
});

describe('parseAccommodationStatusUpdate', () => {
  it('accepts valid status', () => {
    expect(parseAccommodationStatusUpdate({ status: 'approved' }).ok).toBe(true);
  });
  it('rejects invalid', () => {
    expect(parseAccommodationStatusUpdate({ status: 'nope' }).ok).toBe(false);
  });
});

describe('parseAccommodationId', () => {
  it('accepts UUID', () => {
    expect(parseAccommodationId('11111111-1111-1111-1111-111111111111')).not.toBeNull();
  });
  it('rejects bad', () => {
    expect(parseAccommodationId('bad')).toBeNull();
  });
});

describe('listAccommodations', () => {
  it('returns list for admin', async () => {
    const r = await listAccommodations({ repository: repo() }, admin, APP_ID);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items).toHaveLength(1);
  });
  it('denies non-admin', async () => {
    const r = await listAccommodations({ repository: repo() }, noRole, APP_ID);
    expect(r.ok).toBe(false);
  });
});

describe('createAccommodation', () => {
  it('creates for admin', async () => {
    const r = await createAccommodation({ repository: repo() }, admin, APP_ID, {
      requestSummary: 'test',
    });
    expect(r.ok).toBe(true);
  });
  it('denies non-admin', async () => {
    const r = await createAccommodation({ repository: repo() }, noRole, APP_ID, {
      requestSummary: 'test',
    });
    expect(r.ok).toBe(false);
  });
});

describe('updateAccommodationStatus', () => {
  it('updates for admin', async () => {
    const r = await updateAccommodationStatus({ repository: repo() }, admin, 'acc-1', {
      status: 'approved',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await updateAccommodationStatus(
      { repository: repo({ updateAccommodationStatus: () => Promise.resolve(null) }) },
      admin,
      'miss',
      { status: 'declined' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
