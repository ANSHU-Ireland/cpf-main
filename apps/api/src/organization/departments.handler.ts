import {
  parseDepartmentCreate,
  parseDepartmentListQuery,
  type Actor,
  type CreateDepartmentResult,
  type DepartmentCreate,
  type DepartmentDto,
  type DepartmentListQuery,
  type DepartmentPageDto,
  type ListDepartmentsResult,
  type RawDepartmentListQuery,
} from '@cpf/org';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

export interface DepartmentService {
  listDepartments(actor: Actor, query: DepartmentListQuery): Promise<ListDepartmentsResult>;
  createDepartment(actor: Actor, input: DepartmentCreate): Promise<CreateDepartmentResult>;
}

export interface GetDepartmentsRequest {
  readonly actor: Actor;
  readonly query: RawDepartmentListQuery;
  readonly correlationId?: string;
}

export interface PostDepartmentRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type DepartmentListResponse = HttpResponse<DepartmentPageDto> | HttpResponse<ProblemDetails>;
export type DepartmentResponse = HttpResponse<DepartmentDto> | HttpResponse<ProblemDetails>;

export async function handleGetOrganizationDepartments(
  service: DepartmentService,
  req: GetDepartmentsRequest,
): Promise<DepartmentListResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseDepartmentListQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listDepartments(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.page, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

export async function handlePostOrganizationDepartment(
  service: DepartmentService,
  req: PostDepartmentRequest,
): Promise<DepartmentResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseDepartmentCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createDepartment(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.department, correlationId);
  }
  if (result.status === 409) {
    return problemResponse({
      status: 409,
      title: 'Conflict',
      correlationId,
      detail: result.reason,
    });
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
