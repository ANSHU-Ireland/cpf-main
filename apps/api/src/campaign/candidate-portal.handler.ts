import {
  getCandidateProfile,
  getCandidateInvitation,
  getCandidateApplicationStatus,
  type CandidatePortalRepository,
  type GetCandidateProfileResult,
  type GetCandidateInvitationResult,
  type GetCandidateApplicationStatusResult,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CandidatePortalService {
  getProfile(actor: Actor): Promise<GetCandidateProfileResult>;
  getInvitation(actor: Actor): Promise<GetCandidateInvitationResult>;
  getApplicationStatus(
    actor: Actor,
    applicationId: string,
  ): Promise<GetCandidateApplicationStatusResult>;
}

export function createCandidatePortalService(deps: {
  repository: CandidatePortalRepository;
}): CandidatePortalService {
  return {
    getProfile: (actor) => getCandidateProfile(deps, actor),
    getInvitation: (actor) => getCandidateInvitation(deps, actor),
    getApplicationStatus: (actor, applicationId) =>
      getCandidateApplicationStatus(deps, actor, applicationId),
  };
}

export async function handleGetCandidateApplicationStatus(
  svc: CandidatePortalService,
  req: { actor: Actor; applicationId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const result = await svc.getApplicationStatus(req.actor, req.applicationId);
  if (!result.ok) {
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  }
  return jsonResponse(200, result.application, correlationId);
}

export async function handleGetCandidateProfile(
  svc: CandidatePortalService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const result = await svc.getProfile(req.actor);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.profile, correlationId);
}

export async function handleGetCandidateInvitation(
  svc: CandidatePortalService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const result = await svc.getInvitation(req.actor);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.invitation, correlationId);
}
