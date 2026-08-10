import { NextResponse } from 'next/server';
import { supportStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  const { content, internal } = body;

  if (!content?.trim() || content.trim().length < 10) {
    return NextResponse.json({ error: 'content must be at least 10 characters' }, { status: 422 });
  }

  await supportStore.addSupportMessage(id, content.trim(), Boolean(internal));
  return NextResponse.json({ success: true });
}
