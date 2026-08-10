import { NextResponse } from 'next/server';
import { candidateStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await candidateStore.acknowledgeCandidateNotice(id);
  return NextResponse.json({ success: true });
}
