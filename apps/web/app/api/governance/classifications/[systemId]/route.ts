import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Classification read contract is missing',
    detail:
      'The approved public API can create a classification but cannot retrieve the current classification for an AI system.',
    requirementIds: ['GOV-02', 'FR-GOV-03'],
  });
}
