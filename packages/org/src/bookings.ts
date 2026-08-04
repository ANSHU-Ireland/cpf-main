import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BOOKING_STATUSES = [
  'reserved',
  'confirmed',
  'rescheduled',
  'cancelled',
  'expired',
  'completed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface BookingRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly assessmentId: string;
  readonly status: BookingStatus;
  readonly startAt: string;
  readonly endAt: string;
  readonly createdAt: string;
}

export interface BookingCreate {
  readonly applicationId: string;
  readonly assessmentId: string;
  readonly startAt: string;
  readonly endAt: string;
}

export interface BookingRepository {
  listBookings(actor: Actor): Promise<{ items: readonly BookingRecord[]; total: number }>;
  createBooking(actor: Actor, input: BookingCreate): Promise<BookingRecord>;
}

export function parseBookingCreate(
  raw: unknown,
): { ok: true; value: BookingCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['applicationId'] !== 'string' || !UUID_RE.test(obj['applicationId']))
    errors.push('applicationId required (uuid)');
  if (typeof obj['assessmentId'] !== 'string' || !UUID_RE.test(obj['assessmentId']))
    errors.push('assessmentId required (uuid)');
  if (typeof obj['startAt'] !== 'string' || obj['startAt'].length === 0)
    errors.push('startAt required');
  if (typeof obj['endAt'] !== 'string' || obj['endAt'].length === 0) errors.push('endAt required');
  if (errors.length > 0) return { ok: false, errors };
  if ((obj['endAt'] as string) <= (obj['startAt'] as string))
    return { ok: false, errors: ['endAt must be after startAt'] };
  return {
    ok: true,
    value: {
      applicationId: obj['applicationId'] as string,
      assessmentId: obj['assessmentId'] as string,
      startAt: obj['startAt'] as string,
      endAt: obj['endAt'] as string,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listBookings(
  deps: { repository: BookingRepository },
  actor: Actor,
): Promise<Result<{ items: readonly BookingRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'booking', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listBookings(actor)) };
}

export async function createBooking(
  deps: { repository: BookingRepository },
  actor: Actor,
  input: BookingCreate,
): Promise<Result<{ booking: BookingRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'booking', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createBooking(actor, input);
  return { ok: true, booking: r };
}
