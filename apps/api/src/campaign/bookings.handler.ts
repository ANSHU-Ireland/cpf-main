import { listBookings, createBooking, parseBookingCreate, type BookingRepository } from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface BookingService {
  list(actor: Actor): ReturnType<typeof listBookings>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
}

export function createBookingService(deps: { repository: BookingRepository }): BookingService {
  return {
    list: (actor) => listBookings(deps, actor),
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseBookingCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createBooking(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.booking, correlationId);
    },
  };
}

export async function handleListBookings(
  svc: BookingService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleCreateBooking(
  svc: BookingService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}
