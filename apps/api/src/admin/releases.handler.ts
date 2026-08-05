import { listReleases, type ReleaseRepository } from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface ReleaseService {
  list(actor: Actor): Promise<HttpResponse>;
}

export function createReleaseService(deps: { repository: ReleaseRepository }): ReleaseService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listReleases(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
  };
}

export async function handleListReleases(
  svc: ReleaseService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}
