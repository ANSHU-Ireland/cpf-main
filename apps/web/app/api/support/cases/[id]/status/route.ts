import { NextResponse } from 'next/server';
import { supportStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  const { status } = body;

  if (!status?.trim()) {
    return NextResponse.json({ error: 'status is required' }, { status: 422 });
  }

  await supportStore.updateSupportCaseStatus(id, status.trim());
  return NextResponse.json({ success: true });
}
