import {
  listBookings,
  createBooking,
  updateBooking,
  parseBookingCreate,
  parseBookingUpdate,
  parseBookingId,
  type BookingRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface BookingService {
  list(actor: Actor, applicationId: string): ReturnType<typeof listBookings>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  update(actor: Actor, bookingId: string, body: unknown): Promise<HttpResponse>;
}

export function createBookingService(deps: { repository: BookingRepository }): BookingService {
  return {
    list: (actor, applicationId) => listBookings(deps, actor, applicationId),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseBookingCreate(body);
      if (!parsed.ok) {
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      }
      const result = await createBooking(deps, actor, parsed.value);
      if (!result.ok) {
        return problemResponse({
          status: result.status,
          title: result.reason,
          correlationId,
        });
      }
      return jsonResponse(201, result.booking, correlationId);
    },
    update: async (actor, bookingId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseBookingId(bookingId);
      if (id === null) {
        return problemResponse({ status: 422, title: 'Invalid booking ID', correlationId });
      }
      const parsed = parseBookingUpdate(body);
      if (!parsed.ok) {
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      }
      const result = await updateBooking(deps, actor, id, parsed.value);
      if (!result.ok) {
        return problemResponse({
          status: result.status,
          title: result.reason,
          correlationId,
        });
      }
      return jsonResponse(200, result.booking, correlationId);
    },
  };
}

export async function handleListBookings(
  svc: BookingService,
  req: { actor: Actor; applicationId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const applicationId = parseBookingId(req.applicationId);
  if (applicationId === null) {
    return problemResponse({ status: 422, title: 'Invalid application ID', correlationId });
  }
  const result = await svc.list(req.actor, applicationId);
  if (!result.ok) {
    return problemResponse({ status: result.status, title: result.reason, correlationId });
  }
  return jsonResponse(200, { items: result.items, total: result.total }, correlationId);
}

export async function handleCreateBooking(
  svc: BookingService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  const applicationId = parseBookingId(req.applicationId);
  if (applicationId === null) {
    return problemResponse({
      status: 422,
      title: 'Invalid application ID',
      correlationId: ensureCorrelationId(),
    });
  }
  const body =
    req.body !== null && typeof req.body === 'object'
      ? { ...(req.body as Record<string, unknown>), applicationId }
      : req.body;
  return svc.create(req.actor, body);
}

export async function handleUpdateBooking(
  svc: BookingService,
  req: { actor: Actor; bookingId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.update(req.actor, req.bookingId, req.body);
}
