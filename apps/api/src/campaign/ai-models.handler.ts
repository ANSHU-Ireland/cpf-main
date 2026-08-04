import {
  listAiModels,
  getAiModel,
  createAiModel,
  activateAiModel,
  suspendAiModel,
  parseAiModelListQuery,
  parseAiModelCreate,
  parseAiModelId,
  type AiModelDeps,
  type ListAiModelsResult,
  type GetAiModelResult,
  type CreateAiModelResult,
  type ActivateAiModelResult,
  type SuspendAiModelResult,
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
}

export function createAiModelService(deps: AiModelDeps): AiModelService {
  return {
    listModels: (actor, q) => listAiModels(deps, actor, q),
    getModel: (actor, id) => getAiModel(deps, actor, id),
    createModel: (actor, input) => createAiModel(deps, actor, input),
    activateModel: (actor, id) => activateAiModel(deps, actor, id),
    suspendModel: (actor, id) => suspendAiModel(deps, actor, id),
  };
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
