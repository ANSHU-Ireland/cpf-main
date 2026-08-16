import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Post-market signal payload is incomplete',
    detail:
      'A canonical signal requires a post-market plan, metric window, measured value, source reference and review lifecycle.',
    requirementIds: ['GOV-15', 'FR-GOV-21'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
