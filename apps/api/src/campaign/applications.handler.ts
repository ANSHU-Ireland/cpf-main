import {
  listApplications,
  getApplication,
  createApplication,
  updateApplicationStatus,
  parseApplicationListQuery,
  parseApplicationCreate,
  parseApplicationStatusUpdate,
  parseApplicationId,
  parseCampaignIdParam,
  type ApplicationDeps,
  type ListApplicationsResult,
  type GetApplicationResult,
  type CreateApplicationResult,
  type UpdateApplicationStatusResult,
  type RawApplicationListQuery,
} from '@cpf/org';
import type {
  Actor,
  ApplicationCreate,
  ApplicationDto,
  ApplicationListQuery,
  ApplicationPageDto,
  ApplicationStatusUpdate,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface ApplicationService {
  listApplications(
    actor: Actor,
    campaignId: string,
    query: ApplicationListQuery,
  ): Promise<ListApplicationsResult>;
  getApplication(actor: Actor, applicationId: string): Promise<GetApplicationResult>;
  createApplication(
    actor: Actor,
    campaignId: string,
    input: ApplicationCreate,
  ): Promise<CreateApplicationResult>;
  updateApplicationStatus(
    actor: Actor,
    applicationId: string,
    input: ApplicationStatusUpdate,
  ): Promise<UpdateApplicationStatusResult>;
}

export function createApplicationService(deps: ApplicationDeps): ApplicationService {
  return {
    listApplications: (actor, campaignId, query) =>
      listApplications(deps, actor, campaignId, query),
    getApplication: (actor, applicationId) => getApplication(deps, actor, applicationId),
    createApplication: (actor, campaignId, input) =>
      createApplication(deps, actor, campaignId, input),
    updateApplicationStatus: (actor, applicationId, input) =>
      updateApplicationStatus(deps, actor, applicationId, input),
  };
}

export interface GetApplicationsRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly query: RawApplicationListQuery;
  readonly correlationId?: string;
}

export interface GetApplicationRequest {
  readonly actor: Actor;
  readonly applicationId: string;
  readonly correlationId?: string;
}

export interface PostApplicationRequest {
  readonly actor: Actor;
  readonly campaignId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export interface PatchApplicationRequest {
  readonly actor: Actor;
  readonly applicationId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type ApplicationListResponse =
  HttpResponse<ApplicationPageDto> | HttpResponse<ProblemDetails>;
export type ApplicationResponse = HttpResponse<ApplicationDto> | HttpResponse<ProblemDetails>;

export async function handleGetApplications(
  service: ApplicationService,
  req: GetApplicationsRequest,
): Promise<ApplicationListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const parsed = parseApplicationListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listApplications(req.actor, cid, parsed.value);
  if (result.ok) return jsonResponse(200, result.page, correlationId);
  return problemResponse({ status: 403, title: 'Forbidden', correlationId, detail: result.reason });
}

export async function handleGetApplication(
  service: ApplicationService,
  req: GetApplicationRequest,
): Promise<ApplicationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseApplicationId(req.applicationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'applicationId must be a valid UUID.',
    });
  }

  const result = await service.getApplication(req.actor, id);
  if (result.ok) return jsonResponse(200, result.application, correlationId);
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

export async function handlePostApplication(
  service: ApplicationService,
  req: PostApplicationRequest,
): Promise<ApplicationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const cid = parseCampaignIdParam(req.campaignId);
  if (cid === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }

  const parsed = parseApplicationCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createApplication(req.actor, cid, parsed.value);
  if (result.ok) return jsonResponse(200, result.application, correlationId);
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

export async function handlePatchApplication(
  service: ApplicationService,
  req: PatchApplicationRequest,
): Promise<ApplicationResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const id = parseApplicationId(req.applicationId);
  if (id === null) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'applicationId must be a valid UUID.',
    });
  }

  const parsed = parseApplicationStatusUpdate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateApplicationStatus(req.actor, id, parsed.value);
  if (result.ok) return jsonResponse(200, result.application, correlationId);
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
