import { forwardPlatform } from '../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function DELETE(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return forwardPlatform({
    request,
    path: `/me/sessions/${encodeURIComponent(params.id)}`,
    method: 'DELETE',
  });
}
