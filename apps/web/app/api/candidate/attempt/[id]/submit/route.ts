import { runtimeStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (params.id !== runtimeStore.attemptId()) {
    return Response.json({ error: 'Attempt not found.' }, { status: 404 });
  }
  return Response.json(runtimeStore.submitAttempt());
}
