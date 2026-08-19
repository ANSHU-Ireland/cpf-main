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
  readonly status: BookingStatus;
  readonly startAt: string;
  readonly endAt: string;
  readonly candidateTimezone: string;
  readonly rescheduleCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BookingCreate {
  readonly applicationId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly candidateTimezone: string;
}

export interface BookingUpdate {
  readonly status: 'rescheduled' | 'cancelled';
  readonly startAt?: string;
  readonly endAt?: string;
  readonly candidateTimezone?: string;
}

export interface BookingRepository {
  listBookings(
    actor: Actor,
    applicationId: string,
  ): Promise<{ items: readonly BookingRecord[]; total: number }>;
  createBooking(actor: Actor, input: BookingCreate): Promise<BookingRecord | null>;
  updateBooking(
    actor: Actor,
    bookingId: string,
    input: BookingUpdate,
  ): Promise<BookingRecord | null>;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

function validateWindow(startAt: unknown, endAt: unknown, errors: string[]): void {
  if (!validDate(startAt)) errors.push('startAt required (ISO date-time)');
  if (!validDate(endAt)) errors.push('endAt required (ISO date-time)');
  if (validDate(startAt) && validDate(endAt) && Date.parse(endAt) <= Date.parse(startAt)) {
    errors.push('endAt must be after startAt');
  }
}

export function parseBookingId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseBookingCreate(raw: unknown): Parsed<BookingCreate> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj.applicationId !== 'string' || !UUID_RE.test(obj.applicationId)) {
    errors.push('applicationId required (uuid)');
  }
  validateWindow(obj.startAt, obj.endAt, errors);
  if (
    typeof obj.candidateTimezone !== 'string' ||
    obj.candidateTimezone.trim() === '' ||
    obj.candidateTimezone.length > 100
  ) {
    errors.push('candidateTimezone required');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      applicationId: obj.applicationId as string,
      startAt: obj.startAt as string,
      endAt: obj.endAt as string,
      candidateTimezone: obj.candidateTimezone as string,
    },
  };
}

export function parseBookingUpdate(raw: unknown): Parsed<BookingUpdate> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (obj.status !== 'rescheduled' && obj.status !== 'cancelled') {
    return { ok: false, errors: ['status must be rescheduled or cancelled'] };
  }
  if (obj.status === 'cancelled') return { ok: true, value: { status: 'cancelled' } };
  const errors: string[] = [];
  validateWindow(obj.startAt, obj.endAt, errors);
  if (
    typeof obj.candidateTimezone !== 'string' ||
    obj.candidateTimezone.trim() === '' ||
    obj.candidateTimezone.length > 100
  ) {
    errors.push('candidateTimezone required');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      status: 'rescheduled',
      startAt: obj.startAt as string,
      endAt: obj.endAt as string,
      candidateTimezone: obj.candidateTimezone as string,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorized(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    action,
    { type: 'booking', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function listBookings(
  deps: { repository: BookingRepository },
  actor: Actor,
  applicationId: string,
): Promise<Result<{ items: readonly BookingRecord[]; total: number }>> {
  if (!authorized(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listBookings(actor, applicationId)) };
}

export async function createBooking(
  deps: { repository: BookingRepository },
  actor: Actor,
  input: BookingCreate,
): Promise<Result<{ booking: BookingRecord }>> {
  if (!authorized(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const booking = await deps.repository.createBooking(actor, input);
  if (booking === null) return { ok: false, status: 404, reason: 'application_not_found' };
  return { ok: true, booking };
}

export async function updateBooking(
  deps: { repository: BookingRepository },
  actor: Actor,
  bookingId: string,
  input: BookingUpdate,
): Promise<Result<{ booking: BookingRecord }>> {
  if (!authorized(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const booking = await deps.repository.updateBooking(actor, bookingId, input);
  if (booking === null) return { ok: false, status: 404, reason: 'booking_not_found' };
  return { ok: true, booking };
}
