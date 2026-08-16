import { forwardPlatform } from '../../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  return forwardPlatform({
    request,
    path: `/candidate/applications/${encodeURIComponent(params.id)}/withdrawal`,
    method: 'POST',
    body: { reason: 'Withdrawn by candidate after explicit confirmation.' },
  });
}
