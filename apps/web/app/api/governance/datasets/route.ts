import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Dataset governance payload is incomplete',
    detail:
      'The screen omits dataset role, quality, bias, gaps, licence, retention and storage evidence required by the canonical registry.',
    requirementIds: ['GOV-04', 'FR-GOV-05'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
