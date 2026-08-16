import { projectPlatform } from '../../../lib/platform-api.server';
import { template, templates, type PlatformTemplate } from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface TemplateBody {
  readonly name?: unknown;
  readonly subject?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformTemplate[]; total: number }, unknown>(
    { request, path: '/notification-templates', method: 'GET' },
    templates,
  );
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
  if (name.length < 2 || subject.length < 2) {
    return Response.json({ error: 'A template name and subject are required.' }, { status: 422 });
  }
  return projectPlatform<PlatformTemplate, unknown>(
    {
      request,
      path: '/notification-templates',
      method: 'POST',
      body: {
        templateCode: name,
        channel: 'email',
        subject,
        bodyHtml: '<p>{{message}}</p>',
      },
    },
    template,
    201,
  );
}
