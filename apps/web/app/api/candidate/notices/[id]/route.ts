import { REQUIRED_NOTICES } from '../../../../lib/candidate-self-service.server';
import { forwardPlatform } from '../../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> | Response {
  const notice = REQUIRED_NOTICES.find((item) => item.id === params.id);
  if (notice === undefined) {
    return Response.json({ error: 'Notice not found.' }, { status: 404 });
  }
  return forwardPlatform({
    request,
    path: `/candidate/notices/${encodeURIComponent(notice.id)}/acknowledgement`,
    method: 'POST',
    body: { noticeType: notice.noticeType, noticeVersion: notice.noticeVersion },
  });
}
