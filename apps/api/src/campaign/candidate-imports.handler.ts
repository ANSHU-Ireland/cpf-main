import {
  createImportJob,
  getImportJob,
  commitImportJob,
  cancelImportJob,
  parseImportJobCreate,
  parseImportJobId,
  type CandidateImportRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CandidateImportService {
  create(actor: Actor, body: unknown): Promise<HttpResponse>;
  get(actor: Actor, id: string): Promise<HttpResponse>;
  commit(actor: Actor, id: string): Promise<HttpResponse>;
  cancel(actor: Actor, id: string): Promise<HttpResponse>;
}

export function createCandidateImportService(deps: {
  repository: CandidateImportRepository;
}): CandidateImportService {
  return {
    create: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseImportJobCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createImportJob(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.job, correlationId);
    },
    get: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await getImportJob(deps, actor, validId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.job, correlationId);
    },
    commit: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await commitImportJob(deps, actor, validId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.job, correlationId);
    },
    cancel: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await cancelImportJob(deps, actor, validId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.job, correlationId);
    },
  };
}

export async function handleCreateImportJob(
  svc: CandidateImportService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.body);
}

export async function handleGetImportJob(
  svc: CandidateImportService,
  req: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return svc.get(req.actor, req.jobId);
}

export async function handleCommitImportJob(
  svc: CandidateImportService,
  req: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return svc.commit(req.actor, req.jobId);
}

export async function handleCancelImportJob(
  svc: CandidateImportService,
  req: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return svc.cancel(req.actor, req.jobId);
}
