import {
  getCampaignActivationPreflight,
  getCampaignCandidatePreview,
  type Actor,
  type CampaignReadinessRepository,
} from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CampaignReadinessService {
  readonly getActivationPreflight: (
    actor: Actor,
    campaignId: string,
  ) => ReturnType<typeof getCampaignActivationPreflight>;
  readonly getCandidatePreview: (
    actor: Actor,
    campaignId: string,
  ) => ReturnType<typeof getCampaignCandidatePreview>;
}

export function createCampaignReadinessService(
  repository: CampaignReadinessRepository,
): CampaignReadinessService {
  return {
    getActivationPreflight: (actor, campaignId) =>
      getCampaignActivationPreflight(repository, actor, campaignId),
    getCandidatePreview: (actor, campaignId) =>
      getCampaignCandidatePreview(repository, actor, campaignId),
  };
}

async function handleRead<T>(
  campaignId: string,
  read: () => Promise<
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly status: 403 | 404; readonly reason: string }
  >,
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  if (!UUID_RE.test(campaignId)) {
    return problemResponse({
      status: 422,
      title: 'Unprocessable Entity',
      correlationId,
      detail: 'campaignId must be a valid UUID.',
    });
  }
  const result = await read();
  if (!result.ok) {
    return problemResponse({
      status: result.status,
      title: result.status === 404 ? 'Not Found' : 'Forbidden',
      correlationId,
      detail: result.reason,
    });
  }
  return jsonResponse(200, result.value, correlationId);
}

export function handleGetCampaignActivationPreflight(
  service: CampaignReadinessService,
  request: { readonly actor: Actor; readonly campaignId: string },
): Promise<HttpResponse> {
  return handleRead(request.campaignId, () =>
    service.getActivationPreflight(request.actor, request.campaignId),
  );
}

export function handleGetCampaignCandidatePreview(
  service: CampaignReadinessService,
  request: { readonly actor: Actor; readonly campaignId: string },
): Promise<HttpResponse> {
  return handleRead(request.campaignId, () =>
    service.getCandidatePreview(request.actor, request.campaignId),
  );
}
