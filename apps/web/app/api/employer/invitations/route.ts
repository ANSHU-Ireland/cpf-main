import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  addDemoInvitation,
  demoContractReadResponse,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Invitation directory contract not approved',
    detail:
      'The baseline can create an invitation for a known application, but this screen requires a tenant invitation list and email-to-application workflow that the contract does not expose.',
    requirementIds: ['FR-EA-13'],
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
    const email = body?.['email'];
    const campaignName = body?.['campaignName'];
    if (typeof email !== 'string' || typeof campaignName !== 'string') {
      return demoValidationResponse('email and campaignName are required.');
    }
    return Response.json(addDemoInvitation(email, campaignName), { status: 201 });
  }
  return gap(request);
}
