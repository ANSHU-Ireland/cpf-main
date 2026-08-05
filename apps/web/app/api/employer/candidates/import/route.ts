import { employerStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ImportBody {
  readonly stage?: unknown;
  readonly rowText?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let payload: ImportBody;
  try {
    payload = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const rowText = typeof payload.rowText === 'string' ? payload.rowText : '';
  if (rowText.trim().length === 0) {
    return Response.json({ error: 'Paste at least one row to import.' }, { status: 422 });
  }
  if (payload.stage === 'commit') {
    return Response.json(employerStore.commitImport(rowText));
  }
  if (payload.stage === 'validate') {
    return Response.json(employerStore.validateImport(rowText));
  }
  return Response.json(
    { error: 'A valid stage (validate or commit) is required.' },
    { status: 422 },
  );
}
