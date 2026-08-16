import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Traceability collection contract is incomplete',
    detail:
      'The approved API reads one requirement at a time, while this screen requires an authoritative tenant-wide traceability collection.',
    requirementIds: ['AUD-02', 'FR-AUD-03'],
  });
}
