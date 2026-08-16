import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Human-oversight plan contract is missing',
    detail:
      'GOV-09 has no approved public API operation for the authority, competence and stopping-rule checkpoint.',
    requirementIds: ['GOV-09', 'FR-GOV-14'],
  });
}
