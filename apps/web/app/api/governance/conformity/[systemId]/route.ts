import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Conformity assessment read contract is missing',
    detail: 'The approved public API has no read operation for a system conformity assessment.',
    requirementIds: ['GOV-12', 'FR-GOV-18'],
  });
}
