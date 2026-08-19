import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Impact-assessment record is incomplete',
    detail:
      'A valid DPIA or FRIA needs necessity, structured risks, measures, residual risk and consultation fields plus authorised approval.',
    requirementIds: ['GOV-08', 'FR-GOV-12'],
  });
}
