import {
  activateCampaign,
  archiveCampaign,
  closeCampaign,
  duplicateCampaign,
  parseCampaignIdParam,
  parseDuplicateInput,
  pauseCampaign,
  type CampaignLifecycleDeps,
  type DuplicateCampaignResult,
  type DuplicateInput,
  type TransitionCampaignResult,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';
import type { CampaignDto } from '@cpf/org';

export interface CampaignLifecycleService {
  activateCampaign(actor: Actor, id: string): Promise<TransitionCampaignResult>;
  pauseCampaign(actor: Actor, id: string): Promise<TransitionCampaignResult>;
  closeCampaign(actor: Actor, id: string): Promise<TransitionCampaignResult>;
  archiveCampaign(actor: Actor, id: string): Promise<TransitionCampaignResult>;
  duplicateCampaign(
    actor: Actor,
    id: string,
    input: DuplicateInput,
  ): Promise<DuplicateCampaignResult>;
}

export function createCampaignLifecycleService(
  deps: CampaignLifecycleDeps,
): CampaignLifecycleService {
  return {
    activateCampaign: (actor, id) => activateCampaign(deps, actor, id),
    pauseCampaign: (actor, id) => pauseCampaign(deps, actor, id),
    closeCampaign: (actor, id) => closeCampaign(deps, actor, id),
    archiveCampaign: (actor, id) => archiveCampaign(deps, actor, id),
    duplicateCampaign: (actor, id, input) => duplicateCampaign(deps, actor, id, input),
  };
}

export interface LifecycleRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly correlationId?: string;
}

export interface DuplicateRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type LifecycleResponse = HttpResponse<CampaignDto> | HttpResponse<ProblemDetails>;

function handleTransitionResult(
  result: TransitionCampaignResult,
  correlationId: string,
): LifecycleResponse {
  if (result.ok) return jsonResponse(200, result.campaign, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

function validateCampaignId(
  raw: string,
  correlationId: string,
): { ok: true; id: string } | { ok: false; response: LifecycleResponse } {
  const id = parseCampaignIdParam(raw);
  if (id === null) {
    return {
      ok: false,
      response: problemResponse({
        status: 422,
        title: 'Unprocessable Entity',
        correlationId,
        detail: 'campaignId must be a valid UUID.',
      }),
    };
  }
  return { ok: true, id };
}

export async function handleActivateCampaign(
  service: CampaignLifecycleService,
  req: LifecycleRequest,
): Promise<LifecycleResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const v = validateCampaignId(req.campaignId, correlationId);
  if (!v.ok) return v.response;
  const result = await service.activateCampaign(req.actor, v.id);
  return handleTransitionResult(result, correlationId);
}

export async function handlePauseCampaign(
  service: CampaignLifecycleService,
  req: LifecycleRequest,
): Promise<LifecycleResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const v = validateCampaignId(req.campaignId, correlationId);
  if (!v.ok) return v.response;
  const result = await service.pauseCampaign(req.actor, v.id);
  return handleTransitionResult(result, correlationId);
}

export async function handleCloseCampaign(
  service: CampaignLifecycleService,
  req: LifecycleRequest,
): Promise<LifecycleResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const v = validateCampaignId(req.campaignId, correlationId);
  if (!v.ok) return v.response;
  const result = await service.closeCampaign(req.actor, v.id);
  return handleTransitionResult(result, correlationId);
}

export async function handleArchiveCampaign(
  service: CampaignLifecycleService,
  req: LifecycleRequest,
): Promise<LifecycleResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const v = validateCampaignId(req.campaignId, correlationId);
  if (!v.ok) return v.response;
  const result = await service.archiveCampaign(req.actor, v.id);
  return handleTransitionResult(result, correlationId);
}

export async function handleDuplicateCampaign(
  service: CampaignLifecycleService,
  req: DuplicateRequest,
): Promise<LifecycleResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);
  const v = validateCampaignId(req.campaignId, correlationId);
  if (!v.ok) return v.response;

  const parsed = parseDuplicateInput(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.duplicateCampaign(req.actor, v.id, parsed.value);
  if (result.ok) return jsonResponse(200, result.campaign, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
  if (result.status === 422) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}
