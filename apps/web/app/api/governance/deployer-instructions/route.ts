import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Deployer-instruction publication is incomplete',
    detail:
      'Publication requires a versioned protected artifact, accuracy metrics, monitoring, incident and maintenance instructions that this screen does not collect.',
    requirementIds: ['GOV-10', 'FR-GOV-16'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
