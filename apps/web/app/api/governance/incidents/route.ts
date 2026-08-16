import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Serious-incident workflow payload is incomplete',
    detail:
      'The screen omits the AI system, affected people, assessment and authority reporting fields required by the canonical incident report.',
    requirementIds: ['GOV-16', 'FR-GOV-23'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
