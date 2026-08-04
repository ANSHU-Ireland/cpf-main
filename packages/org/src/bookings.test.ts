import { describe, it, expect } from 'vitest';
import { listBookings, createBooking, parseBookingCreate } from './bookings.js';
import type { BookingRepository, BookingRecord } from './bookings.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const A = '33333333-3333-3333-3333-333333333333';
const S = '44444444-4444-4444-4444-444444444444';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const bk: BookingRecord = {
  id: 'b1',
  applicationId: A,
  assessmentId: S,
  status: 'reserved',
  startAt: '2025-01-01T10:00:00Z',
  endAt: '2025-01-01T11:00:00Z',
  createdAt: '',
};

function repo(ov: Partial<BookingRepository> = {}): BookingRepository {
  return {
    listBookings: () => Promise.resolve({ items: [bk], total: 1 }),
    createBooking: () => Promise.resolve(bk),
    ...ov,
  };
}

describe('parseBookingCreate', () => {
  it('valid', () =>
    expect(
      parseBookingCreate({
        applicationId: A,
        assessmentId: S,
        startAt: '2025-01-01T10:00:00Z',
        endAt: '2025-01-01T11:00:00Z',
      }).ok,
    ).toBe(true));
  it('endAt before startAt', () =>
    expect(
      parseBookingCreate({
        applicationId: A,
        assessmentId: S,
        startAt: '2025-01-01T11:00:00Z',
        endAt: '2025-01-01T10:00:00Z',
      }).ok,
    ).toBe(false));
  it('invalid', () => expect(parseBookingCreate({}).ok).toBe(false));
});
describe('listBookings', () => {
  it('ok', async () => expect((await listBookings({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listBookings({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createBooking', () => {
  it('ok', async () =>
    expect(
      (
        await createBooking({ repository: repo() }, admin, {
          applicationId: A,
          assessmentId: S,
          startAt: '2025-01-01T10:00:00Z',
          endAt: '2025-01-01T11:00:00Z',
        })
      ).ok,
    ).toBe(true));
});
