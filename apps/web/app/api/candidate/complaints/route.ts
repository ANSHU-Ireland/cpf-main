import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly subject?: unknown;
  readonly detail?: unknown;
}

export function GET(): Response {
  return Response.json(
    {
      type: 'about:blank',
      title: 'Complaint history is not available in the baseline API contract',
      status: 501,
      detail: 'Submitting a complaint is supported; listing complaints requires a contract update.',
    },
    { status: 501 },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
  if (subject === '' || detail.length < 10) {
    return Response.json(
      { error: 'Add a subject and describe your complaint (10+ characters).' },
      { status: 422 },
    );
  }
  return projectPlatform<
    { id: string; category: string; status: string; createdAt: string },
    object
  >(
    {
      request,
      path: '/candidate/complaints',
      method: 'POST',
      body: { category: subject, description: detail },
    },
    (complaint) => ({
      id: complaint.id,
      subject: complaint.category,
      status: complaint.status === 'resolved' ? 'resolved' : 'open',
      submittedAt: complaint.createdAt,
    }),
    201,
  );
}
