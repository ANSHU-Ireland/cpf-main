import {
  previewCandidateMerge,
  mergeCandidates,
  reverseCandidateMerge,
  parseCandidateMergeInput,
  parseMergeId,
  type CandidateMergeRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface CandidateMergeService {
  preview(actor: Actor, body: unknown): Promise<HttpResponse>;
  merge(actor: Actor, body: unknown): Promise<HttpResponse>;
  reverse(actor: Actor, mergeId: string): Promise<HttpResponse>;
}

export function createCandidateMergeService(deps: {
  repository: CandidateMergeRepository;
}): CandidateMergeService {
  return {
    preview: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseCandidateMergeInput(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await previewCandidateMerge(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.preview, correlationId);
    },
    merge: async (actor, body) => {
      const correlationId = ensureCorrelationId();
      const parsed = parseCandidateMergeInput(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await mergeCandidates(deps, actor, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.merge, correlationId);
    },
    reverse: async (actor, mergeId) => {
      const correlationId = ensureCorrelationId();
      const id = parseMergeId(mergeId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await reverseCandidateMerge(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.merge, correlationId);
    },
  };
}

export async function handlePreviewCandidateMerge(
  svc: CandidateMergeService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.preview(req.actor, req.body);
}

export async function handleMergeCandidates(
  svc: CandidateMergeService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  return svc.merge(req.actor, req.body);
}

export async function handleReverseCandidateMerge(
  svc: CandidateMergeService,
  req: { actor: Actor; mergeId: string },
): Promise<HttpResponse> {
  return svc.reverse(req.actor, req.mergeId);
}
