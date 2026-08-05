import {
  createCandidateComplaint,
  createProfileCorrection,
  requestExplanation,
  requestHumanReview,
  requestWithdrawal,
  parseCandidateComplaintCreate,
  parseProfileCorrectionCreate,
  parseApplicationActionInput,
  parseCandidateApplicationId,
  type CandidateActionRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CandidateActionService {
  complaint(actor: Actor, body: unknown): Promise<HttpResponse>;
  profileCorrection(actor: Actor, body: unknown): Promise<HttpResponse>;
  explanation(actor: Actor, applicationId: string, body: unknown): Promise<HttpResponse>;
  humanReview(actor: Actor, applicationId: string, body: unknown): Promise<HttpResponse>;
  withdrawal(actor: Actor, applicationId: string, body: unknown): Promise<HttpResponse>;
}

export function createCandidateActionService(deps: {
  repository: CandidateActionRepository;
}): CandidateActionService {
  const appAction = async (
    actor: Actor,
    applicationId: string,
    body: unknown,
    fn: typeof requestExplanation,
  ): Promise<HttpResponse> => {
    const correlationId = ensureCorrelationId();
    const id = parseCandidateApplicationId(applicationId);
    if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
    const parsed = parseApplicationActionInput(body);
    if (!parsed.ok)
      return problemResponse({
        status: 422,
        title: 'Validation',
        correlationId,
        errors: parsed.errors.map((message) => ({ detail: message })),
      });
    const r = await fn(deps, actor, id, parsed.value);
    if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
    return jsonResponse(201, r.request, correlationId);
  };
  return {
    complaint: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseCandidateComplaintCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createCandidateComplaint(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.complaint, correlationId);
    },
    profileCorrection: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseProfileCorrectionCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createProfileCorrection(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.correction, correlationId);
    },
    explanation: (actor, applicationId, body) =>
      appAction(actor, applicationId, body, requestExplanation),
    humanReview: (actor, applicationId, body) =>
      appAction(actor, applicationId, body, requestHumanReview),
    withdrawal: (actor, applicationId, body) =>
      appAction(actor, applicationId, body, requestWithdrawal),
  };
}

export async function handleCreateCandidateComplaint(
  svc: CandidateActionService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.complaint(req.actor, req.body);
}

export async function handleCreateProfileCorrection(
  svc: CandidateActionService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.profileCorrection(req.actor, req.body);
}

export async function handleRequestExplanation(
  svc: CandidateActionService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.explanation(req.actor, req.applicationId, req.body);
}

export async function handleRequestHumanReview(
  svc: CandidateActionService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.humanReview(req.actor, req.applicationId, req.body);
}

export async function handleRequestWithdrawal(
  svc: CandidateActionService,
  req: { actor: Actor; applicationId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.withdrawal(req.actor, req.applicationId, req.body);
}
