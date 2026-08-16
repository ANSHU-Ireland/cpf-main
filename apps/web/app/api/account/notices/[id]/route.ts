import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

export function POST(_request: Request, { params }: { params: { id: string } }): Response {
  const correlationId = randomUUID();
  return Response.json(
    {
      type: 'about:blank',
      title: 'Not Implemented',
      status: 501,
      correlationId,
      detail: `Notice ${params.id} cannot be acknowledged because the baseline contract has no account-notice acknowledgement operation.`,
    },
    {
      status: 501,
      headers: {
        'content-type': 'application/problem+json',
        'x-correlation-id': correlationId,
      },
    },
  );
}
