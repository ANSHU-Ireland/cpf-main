import { NextResponse } from 'next/server';
import { supportStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const caseDetail = await supportStore.getSupportCase(id);
  if (!caseDetail) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }
  return NextResponse.json(caseDetail);
}
