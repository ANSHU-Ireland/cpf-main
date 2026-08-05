import { syntheticStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export function DELETE(_request: Request, { params }: { params: { id: string } }): Response {
  const revoked = syntheticStore.revokeSession(params.id);
  if (!revoked) {
    return Response.json({ error: 'Session not found or cannot be revoked.' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
