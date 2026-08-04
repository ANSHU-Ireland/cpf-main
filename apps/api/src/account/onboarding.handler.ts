import {
  parseOnboardingQuery,
  parseOnboardingStepUpdate,
  type Actor,
  type ListOnboardingResult,
  type OnboardingListQuery,
  type OnboardingPageDto,
  type OnboardingStepDto,
  type OnboardingStepUpdate,
  type RawOnboardingQuery,
  type UpdateOnboardingStepResult,
} from '@cpf/account';
import {
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
  type HttpResponse,
  type ProblemDetails,
} from '@cpf/http';

/** Service seam so the handlers can be tested without a database. */
export interface OnboardingService {
  listOnboarding(actor: Actor, query: OnboardingListQuery): Promise<ListOnboardingResult>;
  updateStep(actor: Actor, update: OnboardingStepUpdate): Promise<UpdateOnboardingStepResult>;
}

export interface GetOnboardingRequest {
  readonly actor: Actor;
  readonly query: RawOnboardingQuery;
  readonly correlationId?: string;
}

export interface PutOnboardingStepRequest {
  readonly actor: Actor;
  readonly stepCode: string;
  readonly body: unknown;
  readonly correlationId?: string;
}

export type OnboardingResponse =
  HttpResponse<OnboardingPageDto> | HttpResponse<OnboardingStepDto> | HttpResponse<ProblemDetails>;

/** HTTP boundary for `get_me_onboarding`: validates paging, then maps to 200 `OnboardingPage`. */
export async function handleGetMeOnboarding(
  service: OnboardingService,
  req: GetOnboardingRequest,
): Promise<OnboardingResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseOnboardingQuery(req.query);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The query parameters failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.listOnboarding(req.actor, parsed.value);
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

/** HTTP boundary for `put_me_onboarding_stepCode`: 422 on bad input, else 200 step / 403 / 404. */
export async function handlePutMeOnboardingStep(
  service: OnboardingService,
  req: PutOnboardingStepRequest,
): Promise<OnboardingResponse> {
  const correlationId = ensureCorrelationId(req.correlationId);

  const parsed = parseOnboardingStepUpdate(req.stepCode, req.body);
  if (!parsed.ok) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'The request failed validation.',
      errors: parsed.errors.map((message) => ({ detail: message })),
    });
  }

  const result = await service.updateStep(req.actor, parsed.value);
  if (result.ok) {
    return jsonResponse(200, result.step, correlationId);
  }
  return problemResponse({
    status: result.status,
    title: result.status === 404 ? 'Not Found' : 'Forbidden',
    correlationId,
    detail: result.reason,
  });
}
