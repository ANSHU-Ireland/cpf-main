import { randomUUID } from 'node:crypto';
import { parseDecisionApproval } from '@cpf/org';
import {
  decisionContextResponse,
  employerDecisionApproval,
  readEmployerDecisionContext,
} from '../../../../../lib/employer-decision-api.server';
import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: { readonly id: string } };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    return decisionContextResponse(
      await readEmployerDecisionContext(request, params.id),
      employerDecisionApproval,
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
  const action = input.action;
  if (action !== 'approve' && action !== 'return' && action !== 'issue') {
    return Response.json({ error: 'Action must be approve, return or issue.' }, { status: 422 });
  }
  const parsed = parseDecisionApproval({
    status: action === 'return' ? 'rejected' : 'approved',
    ...(input.rationale === undefined ? {} : { rationale: input.rationale }),
  });
  if (!parsed.ok) {
    return Response.json({ error: parsed.errors.join(' ') }, { status: 422 });
  }
  try {
    const context = await readEmployerDecisionContext(request, params.id);
    const decisionId = context.data.decision?.id;
    if (decisionId === undefined) {
      return Response.json(
        { error: 'A human decision must be drafted before it can be approved or issued.' },
        { status: 409, headers: { 'x-correlation-id': context.correlationId } },
      );
    }
    const mutation = await callPlatform({
      request,
      path: `/decisions/${encodeURIComponent(decisionId)}/${action === 'issue' ? 'issue' : 'approvals'}`,
      method: 'POST',
      body: action === 'issue' ? {} : parsed.value,
      correlationId: context.correlationId,
      idempotencyKey:
        request.headers.get('idempotency-key') ?? `decision-${action}-${randomUUID()}`,
    });
    return decisionContextResponse(
      await readEmployerDecisionContext(request, params.id, mutation.correlationId),
      employerDecisionApproval,
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
