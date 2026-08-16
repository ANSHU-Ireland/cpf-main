import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Kill-switch contract is missing',
    detail:
      'A platform-wide kill switch is consequential and cannot be simulated without an approved API, threat model and dual-control policy.',
    requirementIds: ['OPS-02', 'FR-SEC-15'],
  });
}

export function POST(request: Request): Response {
  return gap(request);
}

export function DELETE(request: Request): Response {
  return gap(request);
}
