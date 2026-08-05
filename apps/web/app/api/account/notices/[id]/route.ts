import { syntheticStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export function POST(_request: Request, { params }: { params: { id: string } }): Response {
  const updated = syntheticStore.acknowledgeNotice(params.id);
  if (updated === null) {
    return Response.json({ error: 'Notice not found.' }, { status: 404 });
  }
  return Response.json(updated);
}
