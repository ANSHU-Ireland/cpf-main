import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Technical-document storage is externally gated',
    detail:
      'An Annex IV version requires a protected object URI, content hash and complete manifest; local placeholder evidence is not permitted.',
    requirementIds: ['GOV-05', 'FR-GOV-06'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
