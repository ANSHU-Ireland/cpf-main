import { listJobs, cancelJob, retryJob, parseJobId, type AdminJobRepository } from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AdminJobService {
  list(actor: Actor): Promise<HttpResponse>;
  cancel(actor: Actor, id: string): Promise<HttpResponse>;
  retry(actor: Actor, id: string): Promise<HttpResponse>;
}

function invalidId(correlationId: string): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Invalid ID',
    correlationId,
    detail: 'jobId must be a valid UUID.',
  });
}

export function createAdminJobService(deps: { repository: AdminJobRepository }): AdminJobService {
  return {
    list: async (actor) => {
      const correlationId = ensureCorrelationId();
      const r = await listJobs(deps, actor);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    cancel: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const jid = parseJobId(id);
      if (jid === null) return invalidId(correlationId);
      const r = await cancelJob(deps, actor, jid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.job, correlationId);
    },
    retry: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const jid = parseJobId(id);
      if (jid === null) return invalidId(correlationId);
      const r = await retryJob(deps, actor, jid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.job, correlationId);
    },
  };
}

export async function handleListJobs(
  svc: AdminJobService,
  req: { actor: Actor },
): Promise<HttpResponse> {
  return svc.list(req.actor);
}

export async function handleCancelJob(
  svc: AdminJobService,
  req: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return svc.cancel(req.actor, req.jobId);
}

export async function handleRetryJob(
  svc: AdminJobService,
  req: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return svc.retry(req.actor, req.jobId);
}
