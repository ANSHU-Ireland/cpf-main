import { describe, it, expect } from 'vitest';
import {
  handleListBookings,
  handleCreateBooking,
  type BookingService,
} from './bookings.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<BookingService> = {}): BookingService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListBookings', () => {
  it('200', async () => expect((await handleListBookings(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListBookings(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleCreateBooking', () => {
  it('201', async () =>
    expect((await handleCreateBooking(svc(), { actor, body: {} })).status).toBe(201));
});
