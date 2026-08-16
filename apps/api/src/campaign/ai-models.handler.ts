import {
  listAiModels,
  getAiModel,
  createAiModel,
  activateAiModel,
  suspendAiModel,
  recordAiModelEvaluation,
  parseAiModelListQuery,
  parseAiModelCreate,
  parseAiModelId,
  type AiModelDeps,
  type ListAiModelsResult,
  type GetAiModelResult,
  type CreateAiModelResult,
  type ActivateAiModelResult,
  type SuspendAiModelResult,
  type RecordAiModelEvaluationResult,
  type RawAiModelListQuery,
} from '@cpf/org';
import type { Actor, AiModelCreate, AiModelListQuery } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AiModelService {
  listModels(actor: Actor, query: AiModelListQuery): Promise<ListAiModelsResult>;
  getModel(actor: Actor, id: string): Promise<GetAiModelResult>;
  createModel(actor: Actor, input: AiModelCreate): Promise<CreateAiModelResult>;
  activateModel(actor: Actor, id: string): Promise<ActivateAiModelResult>;
  suspendModel(actor: Actor, id: string): Promise<SuspendAiModelResult>;
  recordEvaluation(
    actor: Actor,
    id: string,
    input: { readonly outcome: string; readonly rationale: string },
  ): Promise<RecordAiModelEvaluationResult>;
}

export function createAiModelService(deps: AiModelDeps): AiModelService {
  return {
    listModels: (actor, q) => listAiModels(deps, actor, q),
    getModel: (actor, id) => getAiModel(deps, actor, id),
    createModel: (actor, input) => createAiModel(deps, actor, input),
    activateModel: (actor, id) => activateAiModel(deps, actor, id),
    suspendModel: (actor, id) => suspendAiModel(deps, actor, id),
    recordEvaluation: (actor, id, input) => recordAiModelEvaluation(deps, actor, id, input),
  };
}

export async function handlePostAiModelEvaluation(
  svc: AiModelService,
  req: { actor: Actor; modelId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAiModelId(req.modelId);
  if (id === null) {
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  }
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: 'body must be an object',
    });
  }
  const body = req.body as Record<string, unknown>;
  const outcome = typeof body.outcome === 'string' ? body.outcome.trim() : '';
  const rationale = typeof body.rationale === 'string' ? body.rationale.trim() : '';
  if (outcome.length < 2 || rationale.length < 12) {
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: 'outcome and a rationale of at least 12 characters are required',
    });
  }
  const result = await svc.recordEvaluation(req.actor, id, { outcome, rationale });
  if (!result.ok) {
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  }
  return jsonResponse(200, result.model, correlationId);
}

export async function handleGetAiModels(
  svc: AiModelService,
  req: { actor: Actor; query: RawAiModelListQuery },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const parsed = parseAiModelListQuery(req.query);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.listModels(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.page, correlationId);
}

export async function handleGetAiModel(
  svc: AiModelService,
  req: { actor: Actor; modelId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAiModelId(req.modelId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.getModel(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.model, correlationId);
}

export async function handlePostAiModel(
  svc: AiModelService,
  req: { actor: Actor; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const parsed = parseAiModelCreate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.createModel(req.actor, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.model, correlationId);
}

export async function handlePostActivateAiModel(
  svc: AiModelService,
  req: { actor: Actor; modelId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAiModelId(req.modelId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.activateModel(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.model, correlationId);
}

export async function handlePostSuspendAiModel(
  svc: AiModelService,
  req: { actor: Actor; modelId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const id = parseAiModelId(req.modelId);
  if (id === null)
    return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail: 'bad uuid' });
  const result = await svc.suspendModel(req.actor, id);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.model, correlationId);
}
