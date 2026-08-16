import { describe, expect, it } from 'vitest';
import {
  createBooking,
  listBookings,
  parseBookingCreate,
  parseBookingUpdate,
  updateBooking,
  type BookingRecord,
  type BookingRepository,
} from './bookings.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const A = '33333333-3333-3333-3333-333333333333';
const B = '44444444-4444-4444-4444-444444444444';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const booking: BookingRecord = {
  id: B,
  applicationId: A,
  status: 'reserved',
  startAt: '2026-08-20T10:00:00Z',
  endAt: '2026-08-20T11:00:00Z',
  candidateTimezone: 'Europe/Dublin',
  rescheduleCount: 0,
  createdAt: '2026-08-16T10:00:00Z',
  updatedAt: '2026-08-16T10:00:00Z',
};

function repository(overrides: Partial<BookingRepository> = {}): BookingRepository {
  return {
    listBookings: () => Promise.resolve({ items: [booking], total: 1 }),
    createBooking: () => Promise.resolve(booking),
    updateBooking: () => Promise.resolve(booking),
    ...overrides,
  };
}

const createInput = {
  applicationId: A,
  startAt: '2026-08-20T10:00:00Z',
  endAt: '2026-08-20T11:00:00Z',
  candidateTimezone: 'Europe/Dublin',
};

describe('booking parsers', () => {
  it('accepts a schema-aligned create command', () => {
    expect(parseBookingCreate(createInput)).toEqual({ ok: true, value: createInput });
  });

  it('rejects an invalid window', () => {
    expect(parseBookingCreate({ ...createInput, endAt: createInput.startAt }).ok).toBe(false);
  });

  it('requires a complete window for rescheduling but not cancellation', () => {
    expect(parseBookingUpdate({ status: 'rescheduled' }).ok).toBe(false);
    expect(parseBookingUpdate({ status: 'cancelled' })).toEqual({
      ok: true,
      value: { status: 'cancelled' },
    });
  });
});

describe('booking domain', () => {
  it('scopes lists to the requested application', async () => {
    const result = await listBookings({ repository: repository() }, admin, A);
    expect(result).toMatchObject({ ok: true, total: 1 });
  });

  it('denies actors without booking permissions', async () => {
    expect((await listBookings({ repository: repository() }, noRole, A)).ok).toBe(false);
  });

  it('maps missing application and booking records to 404', async () => {
    expect(
      await createBooking(
        { repository: repository({ createBooking: () => Promise.resolve(null) }) },
        admin,
        createInput,
      ),
    ).toMatchObject({ ok: false, status: 404 });
    expect(
      await updateBooking(
        { repository: repository({ updateBooking: () => Promise.resolve(null) }) },
        admin,
        B,
        { status: 'cancelled' },
      ),
    ).toMatchObject({ ok: false, status: 404 });
  });
});
