import { NextResponse } from 'next/server';
import { supportStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await supportStore.revokeJitAccess(id);
  return NextResponse.json({ success: true });
}
