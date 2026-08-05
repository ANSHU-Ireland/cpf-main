import {
  listMaintenanceWindows,
  createMaintenanceWindow,
  parseMaintenanceWindowCreate,
  type AdminMaintenanceRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AdminMaintenanceService {
  list(actor: Actor): Promise<HttpResponse>;
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createAdminMaintenanceService(deps: {
  repository: AdminMaintenanceRepository;
}): AdminMaintenanceService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listMaintenanceWindows(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseMaintenanceWindowCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createMaintenanceWindow(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.window, correlationId);
    },
  };
}

export async function handleListMaintenanceWindows(
  svc: AdminMaintenanceService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCreateMaintenanceWindow(
  svc: AdminMaintenanceService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}
