import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'JIT access lifecycle contract is incomplete',
    detail:
      'Revocation cannot be safely projected because the approved API has no grant read or list operation.',
    requirementIds: ['SUP-03', 'FR-SA-21'],
  });
}
