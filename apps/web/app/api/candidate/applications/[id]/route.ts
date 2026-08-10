import { NextResponse } from 'next/server';
import { candidateStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const application = await candidateStore.getApplicationDetail(id);
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json(application);
}
