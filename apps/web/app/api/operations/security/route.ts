import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Security operations read model is missing',
    detail:
      'The approved API has no security incident and kill-switch status read model for OPS-02.',
    requirementIds: ['OPS-02', 'FR-SEC-14'],
  });
}
