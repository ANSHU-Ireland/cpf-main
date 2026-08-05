import {
  getDeployerInstruction,
  createGovernanceSubmission,
  approveConformityAssessment,
  updateSeriousIncident,
  decideChangeRequest,
  parseGovernanceSubmissionCreate,
  parseSeriousIncidentUpdate,
  parseChangeRequestDecision,
  parseGovernanceSubmissionId,
  type GovernanceSubmissionRepository,
  type GovernanceSubmissionType,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface GovernanceSubmissionService {
  getDeployerInstruction(actor: Actor, systemId: string): Promise<HttpResponse>;
  create(
    actor: Actor,
    submissionType: GovernanceSubmissionType,
    body: unknown,
  ): Promise<HttpResponse>;
  approveConformity(actor: Actor, assessmentId: string): Promise<HttpResponse>;
  updateIncident(actor: Actor, incidentId: string, body: unknown): Promise<HttpResponse>;
  decideChange(actor: Actor, changeId: string, body: unknown): Promise<HttpResponse>;
}

export function createGovernanceSubmissionService(deps: {
  repository: GovernanceSubmissionRepository;
}): GovernanceSubmissionService {
  return {
    getDeployerInstruction: async (actor, systemId) => {
      const correlationId = ensureCorrelationId();
      const id = parseGovernanceSubmissionId(systemId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await getDeployerInstruction(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.instruction, correlationId);
    },
    create: async (actor, submissionType, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseGovernanceSubmissionCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createGovernanceSubmission(deps, actor, submissionType, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.submission, correlationId);
    },
    approveConformity: async (actor, assessmentId) => {
      const correlationId = ensureCorrelationId();
      const id = parseGovernanceSubmissionId(assessmentId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await approveConformityAssessment(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.submission, correlationId);
    },
    updateIncident: async (actor, incidentId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseGovernanceSubmissionId(incidentId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseSeriousIncidentUpdate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await updateSeriousIncident(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.submission, correlationId);
    },
    decideChange: async (actor, changeId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseGovernanceSubmissionId(changeId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseChangeRequestDecision(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await decideChangeRequest(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.submission, correlationId);
    },
  };
}

export async function handleGetDeployerInstruction(
  svc: GovernanceSubmissionService,
  req: { actor: Actor; systemId: string },
): Promise<HttpResponse> {
  return svc.getDeployerInstruction(req.actor, req.systemId);
}

export async function handleCreateGovernanceSubmission(
  svc: GovernanceSubmissionService,
  req: { actor: Actor; submissionType: GovernanceSubmissionType; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.submissionType, req.body);
}

export async function handleApproveConformityAssessment(
  svc: GovernanceSubmissionService,
  req: { actor: Actor; assessmentId: string },
): Promise<HttpResponse> {
  return svc.approveConformity(req.actor, req.assessmentId);
}

export async function handleUpdateSeriousIncident(
  svc: GovernanceSubmissionService,
  req: { actor: Actor; incidentId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateIncident(req.actor, req.incidentId, req.body);
}

export async function handleDecideChangeRequest(
  svc: GovernanceSubmissionService,
  req: { actor: Actor; changeId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.decideChange(req.actor, req.changeId, req.body);
}
