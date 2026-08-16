import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Human-oversight plan contract is missing',
    detail: 'GOV-09 has no approved public API read operation for a system oversight plan.',
    requirementIds: ['GOV-09', 'FR-GOV-14'],
  });
}
