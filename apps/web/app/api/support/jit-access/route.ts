import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'JIT access lifecycle contract is incomplete',
    detail:
      'The approved API can create and revoke a grant but cannot list sessions, and the current screen omits tenant, user, case, purpose and expiry fields.',
    requirementIds: ['SUP-03', 'FR-SA-21'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
