import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Candidate directory contract not approved',
    detail:
      'The public baseline has candidate-detail and import operations, but no approved tenant candidate directory/search or direct-create operation.',
    requirementIds: ['EMP-11'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
