import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  addDemoCandidate,
  demoContractReadResponse,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../lib/demo-contracts.server';

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
  if (functionalDemoEnabled()) {
    const response = demoContractReadResponse(request);
    if (response !== null) return response;
  }
  return gap(request);
}

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const body = await readDemoObject(request);
    const displayName = body?.['displayName'];
    const campaignName = body?.['campaignName'];
    if (typeof displayName !== 'string' || typeof campaignName !== 'string') {
      return demoValidationResponse('displayName and campaignName are required.');
    }
    return Response.json(addDemoCandidate(displayName, campaignName), { status: 201 });
  }
  return gap(request);
}
