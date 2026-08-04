import { describe, it, expect } from 'vitest';
import {
  handleGetAccommodations,
  handlePostAccommodation,
  handlePatchAccommodationStatus,
  type AccommodationService,
} from './accommodations.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = {
  tenantId: VALID_ID,
  userId: VALID_ID,
  roles: ['employer_admin'],
};

function service(overrides: Partial<AccommodationService> = {}): AccommodationService {
  return {
    listAccommodations: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    createAccommodation: () => Promise.resolve({ ok: true as const, accommodation: { id: 'a' } }),
    updateAccommodationStatus: () =>
      Promise.resolve({ ok: true as const, accommodation: { id: 'a' } }),
    ...overrides,
  };
}

describe('handleGetAccommodations', () => {
  it('returns 200', async () => {
    const res = await handleGetAccommodations(service(), { actor, applicationId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad app id', async () => {
    const res = await handleGetAccommodations(service(), { actor, applicationId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 403 when forbidden', async () => {
    const res = await handleGetAccommodations(
      service({
        listAccommodations: () => Promise.resolve({ ok: false, status: 403, reason: 'forbidden' }),
      }),
      { actor, applicationId: VALID_ID },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostAccommodation', () => {
  it('returns 201', async () => {
    const res = await handlePostAccommodation(service(), {
      actor,
      applicationId: VALID_ID,
      body: { requestSummary: 'need more time' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handlePostAccommodation(service(), {
      actor,
      applicationId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
});

describe('handlePatchAccommodationStatus', () => {
  it('returns 200', async () => {
    const res = await handlePatchAccommodationStatus(service(), {
      actor,
      accommodationId: VALID_ID,
      body: { status: 'approved' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid status', async () => {
    const res = await handlePatchAccommodationStatus(service(), {
      actor,
      accommodationId: VALID_ID,
      body: { status: 'nope' },
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePatchAccommodationStatus(
      service({
        updateAccommodationStatus: () =>
          Promise.resolve({ ok: false, status: 404, reason: 'not_found' }),
      }),
      { actor, accommodationId: VALID_ID, body: { status: 'declined' } },
    );
    expect(res.status).toBe(404);
  });
});
