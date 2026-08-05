import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getDashboard());
}
