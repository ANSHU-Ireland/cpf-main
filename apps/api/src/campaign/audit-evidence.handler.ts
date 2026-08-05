import {
  listEvidenceCollections,
  createEvidenceCollection,
  getTraceability,
  parseEvidenceCollectionCreate,
  type AuditEvidenceRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AuditEvidenceService {
  listCollections(actor: Actor): ReturnType<typeof listEvidenceCollections>;
  createCollection(actor: Actor, body: unknown): Promise<HttpResponse>;
  traceability(actor: Actor, requirementId: string): Promise<HttpResponse>;
}

export function createAuditEvidenceService(deps: {
  repository: AuditEvidenceRepository;
}): AuditEvidenceService {
  return {
    listCollections: (actor) => listEvidenceCollections(deps, actor),
    createCollection: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseEvidenceCollectionCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createEvidenceCollection(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.collection, correlationId);
    },
    traceability: async (actor, requirementId) => {
      const correlationId = ensureCorrelationId();
      const r = await getTraceability(deps, actor, requirementId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.row, correlationId);
    },
  };
}

export async function handleListEvidenceCollections(
  svc: AuditEvidenceService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.listCollections(req.actor);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleCreateEvidenceCollection(
  svc: AuditEvidenceService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.createCollection(req.actor, req.body);
}

export async function handleGetTraceability(
  svc: AuditEvidenceService,
  req: { actor: Actor; requirementId: string },
): Promise<HttpResponse> {
  return svc.traceability(req.actor, req.requirementId);
}
