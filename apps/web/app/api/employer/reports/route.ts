import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ReportBody {
  readonly name?: unknown;
  readonly kind?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getReports());
}

export async function POST(request: Request): Promise<Response> {
  let payload: ReportBody;
  try {
    payload = (await request.json()) as ReportBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const kind = typeof payload.kind === 'string' ? payload.kind.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A report name is required.' }, { status: 422 });
  }
  if (kind.length === 0) {
    return Response.json({ error: 'A report kind is required.' }, { status: 422 });
  }
  return Response.json(employerStore.generateReport(name, kind), { status: 201 });
}
