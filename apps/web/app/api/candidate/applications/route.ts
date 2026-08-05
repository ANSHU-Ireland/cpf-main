import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(candidateStore.getApplications());
}
