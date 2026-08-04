import {
  listGovernanceDocs,
  getGovernanceDoc,
  createGovernanceDoc,
  parseGovernanceDocCreate,
  parseGovernanceDocId,
  type GovernanceDocRepository,
  type GovernanceDocType,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface GovernanceDocService {
  list(actor: Actor, docType: GovernanceDocType): ReturnType<typeof listGovernanceDocs>;
  get(actor: Actor, docType: GovernanceDocType, id: string): ReturnType<typeof getGovernanceDoc>;
  create(actor: Actor, docType: GovernanceDocType, body: unknown): Promise<HttpResponse>;
}

export function createGovernanceDocService(deps: {
  repository: GovernanceDocRepository;
}): GovernanceDocService {
  return {
    list: (actor, docType) => listGovernanceDocs(deps, actor, docType),
    get: (actor, docType, id) => getGovernanceDoc(deps, actor, docType, id),
    create: async (actor, docType, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseGovernanceDocCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createGovernanceDoc(deps, actor, docType, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.doc, correlationId);
    },
  };
}

export async function handleListGovernanceDocs(
  svc: GovernanceDocService,
  req: { actor: Actor; docType: GovernanceDocType },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const r = await svc.list(req.actor, req.docType);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
}

export async function handleGetGovernanceDoc(
  svc: GovernanceDocService,
  req: { actor: Actor; docType: GovernanceDocType; docId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseGovernanceDocId(req.docId);
  if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
  const r = await svc.get(req.actor, req.docType, id);
  if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
  return jsonResponse(200, r.doc, correlationId);
}

export async function handleCreateGovernanceDoc(
  svc: GovernanceDocService,
  req: { actor: Actor; docType: GovernanceDocType; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.docType, req.body);
}
