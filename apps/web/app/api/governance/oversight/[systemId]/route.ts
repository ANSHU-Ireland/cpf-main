import { NextResponse } from 'next/server';
import { governanceStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { systemId: string } }) {
  const plan = governanceStore.getOversightPlan(params.systemId);
  if (!plan) {
    return NextResponse.json({ error: 'Oversight plan not found.' }, { status: 404 });
  }
  return NextResponse.json(plan);
}
