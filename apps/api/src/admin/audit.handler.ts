import {
  listAuditEvents,
  createAuditExport,
  parseAuditExportCreate,
  type AdminAuditRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AdminAuditService {
  listEvents(actor: Actor): Promise<HttpResponse>;
  createExport(actor: Actor, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createAdminAuditService(deps: {
  repository: AdminAuditRepository;
}): AdminAuditService {
  return {
    listEvents: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listAuditEvents(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    createExport: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseAuditExportCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createAuditExport(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.export, correlationId);
    },
  };
}

export async function handleListAuditEvents(
  svc: AdminAuditService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.listEvents(req.actor);
}

export async function handleCreateAuditExport(
  svc: AdminAuditService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.createExport(req.actor, req.body);
}
