import { randomUUID } from 'node:crypto';
import { parseDecisionCreate } from '@cpf/org';
import {
  decisionContextResponse,
  employerDecisionDraft,
  readEmployerDecisionContext,
} from '../../../../../lib/employer-decision-api.server';
import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: { readonly id: string } };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    return decisionContextResponse(
      await readEmployerDecisionContext(request, params.id),
      employerDecisionDraft,
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Request body must be a JSON object.' }, { status: 422 });
  }
  const input = body as Record<string, unknown>;
  const parsed = parseDecisionCreate({
    decision: input.outcome,
    rationale: input.rationale,
    evidenceLinks: input.evidenceLinks,
    secondApprovalRequired: true,
  });
  if (!parsed.ok) {
    return Response.json({ error: parsed.errors.join(' ') }, { status: 422 });
  }
  try {
    const mutation = await callPlatform({
      request,
      path: `/applications/${encodeURIComponent(params.id)}/decisions`,
      method: 'POST',
      body: parsed.value,
      idempotencyKey: request.headers.get('idempotency-key') ?? `decision-draft-${randomUUID()}`,
    });
    return decisionContextResponse(
      await readEmployerDecisionContext(request, params.id, mutation.correlationId),
      employerDecisionDraft,
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
