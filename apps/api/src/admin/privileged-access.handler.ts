import {
  createPrivilegedAccessGrant,
  revokePrivilegedAccessGrant,
  parsePrivilegedAccessGrantCreate,
  parsePrivilegedAccessGrantId,
  type AdminPrivilegedAccessRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AdminPrivilegedAccessService {
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  revoke(actor: Actor, id: string): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

export function createAdminPrivilegedAccessService(deps: {
  repository: AdminPrivilegedAccessRepository;
}): AdminPrivilegedAccessService {
  return {
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parsePrivilegedAccessGrantCreate(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await createPrivilegedAccessGrant(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.grant, correlationId);
    },
    revoke: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const gid = parsePrivilegedAccessGrantId(id);
      if (gid === null)
        return problemResponse({
          status: 422,
          title: 'Invalid ID',
          correlationId,
          detail: 'grantId must be a valid UUID.',
        });
      const r = await revokePrivilegedAccessGrant(deps, actor, gid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(204, {}, correlationId);
    },
  };
}

export async function handleCreatePrivilegedAccessGrant(
  svc: AdminPrivilegedAccessService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleRevokePrivilegedAccessGrant(
  svc: AdminPrivilegedAccessService,
  req: { actor: Actor; grantId: string },
): Promise<HttpResponse> {
  return svc.revoke(req.actor, req.grantId);
}
