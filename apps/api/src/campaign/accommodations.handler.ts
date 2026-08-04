import {
  listAccommodations,
  createAccommodation,
  updateAccommodationStatus,
  parseAccommodationCreate,
  parseAccommodationStatusUpdate,
  parseAccommodationApplicationId,
  parseAccommodationId,
} from '@cpf/org';
import type { Actor, AccommodationCreate, AccommodationStatusUpdate } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

type ListResult =
  | { ok: true; items: readonly unknown[]; total: number }
  | { ok: false; status: number; reason: string };
type MutateResult = { ok: true; accommodation: unknown } | { ok: false; status: number; reason: string };

export interface AccommodationService {
  listAccommodations(actor: Actor, applicationId: string): Promise<ListResult>;
  createAccommodation(actor: Actor, applicationId: string, input: AccommodationCreate): Promise<MutateResult>;
  updateAccommodationStatus(actor: Actor, id: string, input: AccommodationStatusUpdate): Promise<MutateResult>;
}

export function createAccommodationService(deps: {
  repository: Parameters<typeof listAccommodations>[0]['repository'];
}): AccommodationService {
  return {
    listAccommodations: (actor, appId) => listAccommodations(deps, actor, appId),
    createAccommodation: (actor, appId, input) => createAccommodation(deps, actor, appId, input),
    updateAccommodationStatus: (actor, id, input) => updateAccommodationStatus(deps, actor, id, input),
  };
}

export async function handleGetAccommodations(
  svc: AccommodationService,
  req: { actor: Actor; applicationId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const appId = parseAccommodationApplicationId(req.applicationId);
  if (appId === null) return problemResponse({ status: 422, title: 'Invalid application ID', correlationId, detail: 'bad uuid' });

  const result = await svc.listAccommodations(req.actor, appId);
  if (!result.ok) return problemResponse({ status: result.status, title: result.reason, correlationId, detail: result.reason });
  return jsonResponse(200, { items: result.items, total: result.total }, correlationId);
}

export async function handlePostAccommodation(
  svc: AccommodationService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const appId = parseAccommodationApplicationId(req.applicationId);
  if (appId === null) return problemResponse({ status: 422, title: 'Invalid application ID', correlationId, detail: 'bad uuid' });

  const parsed = parseAccommodationCreate(req.body);
  if (!parsed.ok) return problemResponse({ status: 422, title: 'Validation', correlationId, detail: parsed.errors.join(', ') });

  const result = await svc.createAccommodation(req.actor, appId, parsed.value);
  if (!result.ok) return problemResponse({ status: result.status, title: result.reason, correlationId, detail: result.reason });
  return jsonResponse(201, result.accommodation, correlationId);
}

export async function handlePatchAccommodationStatus(
  svc: AccommodationService,
  req: { actor: Actor; accommodationId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const accId = parseAccommodationId(req.accommodationId);
  if (accId === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });

  const parsed = parseAccommodationStatusUpdate(req.body);
  if (!parsed.ok) return problemResponse({ status: 422, title: 'Validation', correlationId, detail: parsed.errors.join(', ') });

  const result = await svc.updateAccommodationStatus(req.actor, accId, parsed.value);
  if (!result.ok) return problemResponse({ status: result.status, title: result.reason, correlationId, detail: result.reason });
  return jsonResponse(200, result.accommodation, correlationId);
}
