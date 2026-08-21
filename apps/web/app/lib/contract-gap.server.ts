import 'server-only';

import { randomUUID } from 'node:crypto';
import { demoContractReadResponse, functionalDemoEnabled } from './demo-contracts.server';

const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Honest boundary for a documented public-API gap. Production remains fail-closed when the
 * authoritative contract cannot fulfil a request. The explicitly labelled local demo may serve a
 * read-only synthetic projection for UAT; unknown routes and mutations still reach this boundary.
 */
export function contractGapResponse(
  request: Request,
  input: {
    readonly title: string;
    readonly detail: string;
    readonly requirementIds: readonly string[];
  },
): Response {
  if (functionalDemoEnabled()) {
    const demoResponse = demoContractReadResponse(request);
    if (demoResponse !== null) return demoResponse;
  }

  const correlationId = request.headers.get(CORRELATION_HEADER)?.trim() || randomUUID();
  return Response.json(
    {
      type: 'https://cpf.example/problems/public-api-contract-gap',
      title: input.title,
      status: 501,
      detail: input.detail,
      correlationId,
      requirementIds: input.requirementIds,
      remediation: 'Approve the documented OpenAPI delta before enabling this workflow.',
    },
    {
      status: 501,
      headers: {
        'content-type': 'application/problem+json',
        [CORRELATION_HEADER]: correlationId,
      },
    },
  );
}
