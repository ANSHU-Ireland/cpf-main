import {
  cancelImportJob,
  commitImportJob,
  createImportJob,
  getImportJob,
  listImportRows,
  parseImportJobCreate,
  parseImportJobId,
  parseImportRowUpdate,
  updateImportRow,
  type CandidateImportRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CandidateImportService {
  create(
    actor: Actor,
    campaignId: string,
    idempotencyKey: string,
    body: unknown,
  ): Promise<HttpResponse>;
  get(actor: Actor, id: string): Promise<HttpResponse>;
  listRows(actor: Actor, id: string, limit: number): Promise<HttpResponse>;
  updateRow(
    actor: Actor,
    importId: string,
    rowId: string,
    idempotencyKey: string,
    body: unknown,
  ): Promise<HttpResponse>;
  commit(actor: Actor, id: string, idempotencyKey: string): Promise<HttpResponse>;
  cancel(actor: Actor, id: string, idempotencyKey: string): Promise<HttpResponse>;
}

function commandWith(
  body: unknown,
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const container = body as Record<string, unknown>;
    const data = container['data'];
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      return { ...container, data: { ...(data as Record<string, unknown>), ...values } };
    }
    return { ...container, ...values };
  }
  return values;
}

function idempotencyProblem(idempotencyKey: string, correlationId: string): HttpResponse | null {
  if (idempotencyKey.trim().length > 0 && idempotencyKey.length <= 200) return null;
  return problemResponse({
    status: 422,
    title: 'Validation',
    detail: 'A valid Idempotency-Key header is required.',
    correlationId,
  });
}

export function createCandidateImportService(deps: {
  repository: CandidateImportRepository;
}): CandidateImportService {
  return {
    create: async (actor, campaignId, idempotencyKey, body) => {
      const correlationId = ensureCorrelationId();
      const keyProblem = idempotencyProblem(idempotencyKey, correlationId);
      if (keyProblem !== null) return keyProblem;
      const parsed = parseImportJobCreate(commandWith(body, { campaignId, idempotencyKey }));
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const result = await createImportJob(deps, actor, parsed.value);
      if (!result.ok)
        return problemResponse({
          status: result.status,
          title: 'Candidate import unavailable',
          detail: result.reason,
          correlationId,
        });
      return jsonResponse(200, result.job, correlationId);
    },
    get: async (actor, id) => {
      const correlationId = ensureCorrelationId();
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const result = await getImportJob(deps, actor, validId);
      if (!result.ok)
        return problemResponse({ status: result.status, title: result.reason, correlationId });
      return jsonResponse(200, result.job, correlationId);
    },
    listRows: async (actor, id, limit) => {
      const correlationId = ensureCorrelationId();
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const result = await listImportRows(deps, actor, validId, limit);
      if (!result.ok)
        return problemResponse({ status: result.status, title: result.reason, correlationId });
      return jsonResponse(200, result.rows, correlationId);
    },
    updateRow: async (actor, importId, rowId, idempotencyKey, body) => {
      const correlationId = ensureCorrelationId();
      const keyProblem = idempotencyProblem(idempotencyKey, correlationId);
      if (keyProblem !== null) return keyProblem;
      const validImportId = parseImportJobId(importId);
      const validRowId = parseImportJobId(rowId);
      if (validImportId === null || validRowId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseImportRowUpdate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const result = await updateImportRow(deps, actor, validImportId, validRowId, parsed.value);
      if (!result.ok)
        return problemResponse({
          status: result.status,
          title: 'Candidate import row unavailable',
          detail: result.reason,
          correlationId,
        });
      return jsonResponse(200, result.row, correlationId);
    },
    commit: async (actor, id, idempotencyKey) => {
      const correlationId = ensureCorrelationId();
      const keyProblem = idempotencyProblem(idempotencyKey, correlationId);
      if (keyProblem !== null) return keyProblem;
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const result = await commitImportJob(deps, actor, validId);
      if (!result.ok)
        return problemResponse({
          status: result.status,
          title: 'Candidate import cannot be committed',
          detail: result.reason,
          correlationId,
        });
      return jsonResponse(200, result.job, correlationId);
    },
    cancel: async (actor, id, idempotencyKey) => {
      const correlationId = ensureCorrelationId();
      const keyProblem = idempotencyProblem(idempotencyKey, correlationId);
      if (keyProblem !== null) return keyProblem;
      const validId = parseImportJobId(id);
      if (validId === null)
        return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const result = await cancelImportJob(deps, actor, validId);
      if (!result.ok)
        return problemResponse({
          status: result.status,
          title: 'Candidate import cannot be cancelled',
          detail: result.reason,
          correlationId,
        });
      return jsonResponse(200, result.job, correlationId);
    },
  };
}

export async function handleCreateImportJob(
  service: CandidateImportService,
  request: {
    actor: Actor;
    campaignId: string;
    idempotencyKey: string;
    body: unknown;
  },
): Promise<HttpResponse> {
  return service.create(request.actor, request.campaignId, request.idempotencyKey, request.body);
}

export async function handleGetImportJob(
  service: CandidateImportService,
  request: { actor: Actor; jobId: string },
): Promise<HttpResponse> {
  return service.get(request.actor, request.jobId);
}

export async function handleGetImportRows(
  service: CandidateImportService,
  request: { actor: Actor; jobId: string; limit: number },
): Promise<HttpResponse> {
  return service.listRows(request.actor, request.jobId, request.limit);
}

export async function handlePatchImportRow(
  service: CandidateImportService,
  request: {
    actor: Actor;
    jobId: string;
    rowId: string;
    idempotencyKey: string;
    body: unknown;
  },
): Promise<HttpResponse> {
  return service.updateRow(
    request.actor,
    request.jobId,
    request.rowId,
    request.idempotencyKey,
    request.body,
  );
}

export async function handleCommitImportJob(
  service: CandidateImportService,
  request: { actor: Actor; jobId: string; idempotencyKey: string },
): Promise<HttpResponse> {
  return service.commit(request.actor, request.jobId, request.idempotencyKey);
}

export async function handleCancelImportJob(
  service: CandidateImportService,
  request: { actor: Actor; jobId: string; idempotencyKey: string },
): Promise<HttpResponse> {
  return service.cancel(request.actor, request.jobId, request.idempotencyKey);
}
