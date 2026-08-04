import {
  parseSupportCaseCreate,
  parseSupportCaseQuery,
  type Actor,
  type CreateSupportCaseResult,
  type ListSupportCasesResult,
  type RawSupportCaseQuery,
  type SupportCaseCreate,
  type SupportCaseDto,
  type SupportCaseListQuery,
  type SupportCasePageDto,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface SupportCasesService {
  listCases(actor: Actor, query: SupportCaseListQuery): Promise<ListSupportCasesResult>;
  createCase(actor: Actor, input: SupportCaseCreate): Promise<CreateSupportCaseResult>;
}

export interface GetSupportCasesRequest {
  readonly actor: Actor;
  readonly query: RawSupportCaseQuery;
  readonly correlationId?: string;
}

export interface PostSupportCaseRequest {
  readonly actor: Actor;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type SupportCasesResponse =
  HttpResponse<SupportCasePageDto> | HttpResponse<SupportCaseDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_support_cases`: validates paging, then maps to 200 `SupportCasePage`. */
export async function handleGetMeSupportCases(
  service: SupportCasesService,
  req: GetSupportCasesRequest,
): Promise<SupportCasesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseSupportCaseQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listCases(req.actor, parsed.value);
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

/** HTTP boundary for `post_me_support_cases`: 422 on bad body, else 200 case / 403. */
export async function handlePostMeSupportCase(
  service: SupportCasesService,
  req: PostSupportCaseRequest,
): Promise<SupportCasesResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseSupportCaseCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.createCase(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.supportCase, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
