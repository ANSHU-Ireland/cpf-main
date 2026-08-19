import { describe, expect, it, vi } from 'vitest';
import {
  handleCreateBooking,
  handleListBookings,
  handleUpdateBooking,
  type BookingService,
} from './bookings.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function service(overrides: Partial<BookingService> = {}): BookingService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    update: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...overrides,
  };
}

describe('booking handlers', () => {
  it('passes the path application id to list and create', async () => {
    const list = vi.fn().mockResolvedValue({ ok: true as const, items: [], total: 0 });
    const create = vi.fn().mockResolvedValue({ status: 201, headers: {}, body: '{}' });
    expect((await handleListBookings(service({ list }), { actor, applicationId: ID })).status).toBe(
      200,
    );
    expect(list).toHaveBeenCalledWith(actor, ID);
    expect(
      (
        await handleCreateBooking(service({ create }), {
          actor,
          applicationId: ID,
          body: { startAt: '2026-08-20T10:00:00Z' },
        })
      ).status,
    ).toBe(201);
    expect(create).toHaveBeenCalledWith(actor, expect.objectContaining({ applicationId: ID }));
  });

  it('rejects malformed path ids', async () => {
    expect((await handleListBookings(service(), { actor, applicationId: 'bad' })).status).toBe(422);
    expect(
      (await handleCreateBooking(service(), { actor, applicationId: 'bad', body: {} })).status,
    ).toBe(422);
  });

  it('routes booking updates separately from creation', async () => {
    const update = vi.fn().mockResolvedValue({ status: 200, headers: {}, body: '{}' });
    expect(
      (
        await handleUpdateBooking(service({ update }), {
          actor,
          bookingId: ID,
          body: { status: 'cancelled' },
        })
      ).status,
    ).toBe(200);
    expect(update).toHaveBeenCalledWith(actor, ID, { status: 'cancelled' });
  });
});
