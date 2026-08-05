import { NextResponse } from 'next/server';
import { governanceStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { systemId: string } }) {
  const assessment = governanceStore.getConformityAssessment(params.systemId);
  if (!assessment) {
    return NextResponse.json({ error: 'Conformity assessment not found.' }, { status: 404 });
  }
  return NextResponse.json(assessment);
}
