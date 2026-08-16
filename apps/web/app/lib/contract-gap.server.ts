import 'server-only';

import { randomUUID } from 'node:crypto';

const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Honest boundary for a documented public-API gap. A UI route must never fall
 * back to fabricated process-local records when the authoritative contract has
 * no operation capable of fulfilling the request.
 */
export function contractGapResponse(
  request: Request,
  input: {
    readonly title: string;
    readonly detail: string;
    readonly requirementIds: readonly string[];
  },
): Response {
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
