import {
  parseReviewerListQuery,
  parseReviewerProfileUpdate,
  parseAvailabilityReplace,
  getReviewerProfile,
  updateReviewerProfile,
  listReviewerAvailability,
  replaceReviewerAvailability,
  listReviewerTraining,
  type Actor,
  type ReviewerRepository,
} from '@cpf/account';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface ReviewerService {
  getProfile(actor: Actor): Promise<HttpResponse>;
  updateProfile(actor: Actor, body: unknown): Promise<HttpResponse>;
  listAvailability(actor: Actor, query: unknown): Promise<HttpResponse>;
  replaceAvailability(actor: Actor, body: unknown): Promise<HttpResponse>;
  listTraining(actor: Actor, query: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: readonly string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createReviewerService(deps: { repository: ReviewerRepository }): ReviewerService {
  return {
    getProfile: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await getReviewerProfile(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.profile, correlationId);
    },
    updateProfile: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseReviewerProfileUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateReviewerProfile(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.profile, correlationId);
    },
    listAvailability: async (actor, query) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseReviewerListQuery(query);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await listReviewerAvailability(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.page, correlationId);
    },
    replaceAvailability: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseAvailabilityReplace(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await replaceReviewerAvailability(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { windows: r.windows }, correlationId);
    },
    listTraining: async (actor, query) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseReviewerListQuery(query);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await listReviewerTraining(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.page, correlationId);
    },
  };
}

export const handleGetMyReviewerProfile = (
  svc: ReviewerService,
  req: { actor: Actor },
): Promise<HttpResponse> => svc.getProfile(req.actor);
export const handlePatchMyReviewerProfile = (
  svc: ReviewerService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.updateProfile(req.actor, req.body);
export const handleGetReviewerAvailability = (
  svc: ReviewerService,
  req: { actor: Actor; query: unknown },
): Promise<HttpResponse> => svc.listAvailability(req.actor, req.query);
export const handlePutReviewerAvailability = (
  svc: ReviewerService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> => svc.replaceAvailability(req.actor, req.body);
export const handleGetReviewerTraining = (
  svc: ReviewerService,
  req: { actor: Actor; query: unknown },
): Promise<HttpResponse> => svc.listTraining(req.actor, req.query);
