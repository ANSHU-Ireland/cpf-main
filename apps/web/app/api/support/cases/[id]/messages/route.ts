import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import {
  addDemoSupportMessage,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (functionalDemoEnabled()) {
    const body = await readDemoObject(request);
    const content = body?.['content'];
    const internal = body?.['internal'];
    if (
      typeof content !== 'string' ||
      content.trim().length < 10 ||
      typeof internal !== 'boolean'
    ) {
      return demoValidationResponse(
        'A message of at least 10 characters and its visibility are required.',
      );
    }
    addDemoSupportMessage(params.id, content.trim(), internal);
    return new Response(null, { status: 204 });
  }
  return contractGapResponse(request, {
    title: 'Administrative case-message contract is missing',
    detail:
      'The approved message operation is requester-scoped; it cannot safely be reused for an administrative internal or requester-visible reply.',
    requirementIds: ['SUP-02', 'FR-SUP-03'],
  });
}
