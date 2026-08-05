import {
  createScorecardAmendment,
  setObservationDisposition,
  resolveIntegrityEvent,
  parseScorecardAmendmentCreate,
  parseObservationDisposition,
  parseIntegrityResolution,
  parseReviewQualityId,
  type ReviewQualityRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface ReviewQualityService {
  amendScorecard(actor: Actor, scorecardId: string, body: unknown): Promise<HttpResponse>;
  disposeObservation(actor: Actor, observationId: string, body: unknown): Promise<HttpResponse>;
  resolveIntegrity(actor: Actor, eventId: string, body: unknown): Promise<HttpResponse>;
}

export function createReviewQualityService(deps: {
  repository: ReviewQualityRepository;
}): ReviewQualityService {
  return {
    amendScorecard: async (actor, scorecardId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseReviewQualityId(scorecardId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseScorecardAmendmentCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createScorecardAmendment(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.amendment, correlationId);
    },
    disposeObservation: async (actor, observationId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseReviewQualityId(observationId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseObservationDisposition(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await setObservationDisposition(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.observation, correlationId);
    },
    resolveIntegrity: async (actor, eventId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseReviewQualityId(eventId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseIntegrityResolution(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await resolveIntegrityEvent(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.event, correlationId);
    },
  };
}

export async function handleCreateScorecardAmendment(
  svc: ReviewQualityService,
  req: { actor: Actor; scorecardId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.amendScorecard(req.actor, req.scorecardId, req.body);
}

export async function handleSetObservationDisposition(
  svc: ReviewQualityService,
  req: { actor: Actor; observationId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.disposeObservation(req.actor, req.observationId, req.body);
}

export async function handleResolveIntegrityEvent(
  svc: ReviewQualityService,
  req: { actor: Actor; eventId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.resolveIntegrity(req.actor, req.eventId, req.body);
}
