import {
  parseCampaignCreate,
  parseCampaignId,
  parseCampaignListQuery,
  parseCampaignUpdate,
  type Actor,
  type CampaignCreate,
  type CampaignDto,
  type CampaignListQuery,
  type CampaignPageDto,
  type CampaignUpdate,
  type CreateCampaignResult,
  type GetCampaignResult,
  type ListCampaignsResult,
  type RawCampaignListQuery,
  type UpdateCampaignResult,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface CampaignService {
  listCampaigns(actor: Actor, query: CampaignListQuery): Promise<ListCampaignsResult>;
  getCampaign(actor: Actor, id: string): Promise<GetCampaignResult>;
  createCampaign(actor: Actor, input: CampaignCreate): Promise<CreateCampaignResult>;
  updateCampaign(actor: Actor, id: string, input: CampaignUpdate): Promise<UpdateCampaignResult>;
}

export interface GetCampaignsRequest {
  readonly actor: Actor;
  readonly query: RawCampaignListQuery;
  readonly correlationId?: string;
}

export interface GetCampaignRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly correlationId?: string;
}

export interface PostCampaignRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export interface PatchCampaignRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type CampaignListResponse = HttpResponse<CampaignPageDto> | HttpResponse<ProblemDetails>;
export type CampaignResponse = HttpResponse<CampaignDto> | HttpResponse<ProblemDetails>;

export async function handleGetCampaigns(
  service: CampaignService,
  req: GetCampaignsRequest,
): Promise<CampaignListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseCampaignListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listCampaigns(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handleGetCampaign(
  service: CampaignService,
  req: GetCampaignRequest,
): Promise<CampaignResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseCampaignId(req.campaignId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const result = await service.getCampaign(req.actor, id);
  if (result.ok) return jsonResponse(200, result.campaign, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handlePostCampaign(
  service: CampaignService,
  req: PostCampaignRequest,
): Promise<CampaignResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseCampaignCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createCampaign(req.actor, parsed.value);
  if (result.ok) return jsonResponse(200, result.campaign, correlationId);
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

export async function handlePatchCampaign(
  service: CampaignService,
  req: PatchCampaignRequest,
): Promise<CampaignResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseCampaignId(req.campaignId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const parsed = parseCampaignUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateCampaign(req.actor, id, parsed.value);
  if (result.ok) return jsonResponse(200, result.campaign, correlationId);
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}
