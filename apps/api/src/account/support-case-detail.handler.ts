import {
  isSupportCaseId,
  parseSupportMessageCreate,
  parseSupportMessageQuery,
  type Actor,
  type AddSupportMessageResult,
  type GetSupportCaseResult,
  type RawSupportMessageQuery,
  type SupportCaseDetailDto,
  type SupportMessageCreate,
  type SupportMessageDto,
  type SupportMessageListQuery,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface SupportCaseDetailService {
  getCase(
    actor: Actor,
    caseId: string,
    query: SupportMessageListQuery,
  ): Promise<GetSupportCaseResult>;
  addMessage(
    actor: Actor,
    caseId: string,
    input: SupportMessageCreate,
  ): Promise<AddSupportMessageResult>;
}

export interface GetSupportCaseRequest {
  readonly actor: Actor;
  readonly caseId: string;
  readonly query: RawSupportMessageQuery;
  readonly correlationId?: string;
}

export interface PostSupportMessageRequest {
  readonly actor: Actor;
  readonly caseId: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type SupportCaseDetailResponse =
  | HttpResponse<SupportCaseDetailDto>
  | HttpResponse<SupportMessageDto>
  | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_support_cases_caseId`: 422 on bad path/query, else 200 detail / 403 / 404. */
export async function handleGetMeSupportCase(
  service: SupportCaseDetailService,
  req: GetSupportCaseRequest,
): Promise<SupportCaseDetailResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  if (!isSupportCaseId(req.caseId)) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The caseId path parameter must be a UUID.',
    });
  }

  const parsed = parseSupportMessageQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.getCase(req.actor, req.caseId, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.detail, correlationId);
  }
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: 'No support case with that id belongs to the caller.',
    });
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}

/** HTTP boundary for `post_me_support_cases_caseId_messages`: 422 on bad input, else 200 message / 403 / 404. */
export async function handlePostMeSupportCaseMessage(
  service: SupportCaseDetailService,
  req: PostSupportMessageRequest,
): Promise<SupportCaseDetailResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  if (!isSupportCaseId(req.caseId)) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The caseId path parameter must be a UUID.',
    });
  }

  const parsed = parseSupportMessageCreate(req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request body failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.addMessage(req.actor, req.caseId, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.message, correlationId);
  }
  if (result.status === 404) {
    return problemResponse({
      status: 404,
      title: 'Not Found',
      correlationId,
      detail: 'No support case with that id belongs to the caller.',
    });
  }
  return problemResponse({
    status: result.status,
    title: 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
