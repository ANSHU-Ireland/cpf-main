import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface TemplateBody {
  readonly name?: unknown;
  readonly subject?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getTemplates());
}

export async function POST(request: Request): Promise<Response> {
  let payload: TemplateBody;
  try {
    payload = (await request.json()) as TemplateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A template name is required.' }, { status: 422 });
  }
  if (subject.length < 2) {
    return Response.json({ error: 'A subject line is required.' }, { status: 422 });
  }
  return Response.json(employerStore.createTemplate(name, subject), { status: 201 });
}
