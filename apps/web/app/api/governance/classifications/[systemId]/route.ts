import { NextResponse } from 'next/server';
import { governanceStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { systemId: string } }) {
  const classification = governanceStore.getClassification(params.systemId);
  if (!classification) {
    return NextResponse.json({ error: 'Classification not found.' }, { status: 404 });
  }
  return NextResponse.json(classification);
}
