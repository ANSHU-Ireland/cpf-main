import {
  listAdminSupportCases,
  assignSupportCase,
  updateSupportCaseStatus,
  parseSupportCaseAssignment,
  parseSupportCaseStatusUpdate,
  parseSupportCaseId,
  type AdminSupportCaseRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AdminSupportCaseService {
  list(actor: Actor): Promise<HttpResponse>;
  assign(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
  updateStatus(actor: Actor, id: string, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

function invalidId(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Invalid ID',
    correlationId,
    detail: 'caseId must be a valid UUID.',
  });
}

export function createAdminSupportCaseService(deps: {
  repository: AdminSupportCaseRepository;
}): AdminSupportCaseService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listAdminSupportCases(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    assign: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const cid = parseSupportCaseId(id);
      if (cid === null) return invalidId(correlationId);
      const parsed = parseSupportCaseAssignment(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await assignSupportCase(deps, actor, cid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.case, correlationId);
    },
    updateStatus: async (actor, id, body) => {
      const correlationId = ensureCorrelationId();
      const cid = parseSupportCaseId(id);
      if (cid === null) return invalidId(correlationId);
      const parsed = parseSupportCaseStatusUpdate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await updateSupportCaseStatus(deps, actor, cid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.case, correlationId);
    },
  };
}

export async function handleListAdminSupportCases(
  svc: AdminSupportCaseService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleAssignSupportCase(
  svc: AdminSupportCaseService,
  req: { actor: Actor; caseId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.assign(req.actor, req.caseId, req.body);
}

export async function handleUpdateSupportCaseStatus(
  svc: AdminSupportCaseService,
  req: { actor: Actor; caseId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.updateStatus(req.actor, req.caseId, req.body);
}
