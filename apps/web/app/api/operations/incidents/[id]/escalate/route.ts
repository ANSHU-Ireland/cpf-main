import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Security incident escalation contract is missing',
    detail:
      'OPS-02 has no approved public API operation for escalating a selected security incident.',
    requirementIds: ['OPS-02', 'FR-SEC-14'],
  });
}
