import { NextResponse } from 'next/server';
import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await candidateStore.getReviewableDecisions();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { decisionId, grounds } = body;

  if (!decisionId?.trim()) {
    return NextResponse.json({ error: 'decisionId is required' }, { status: 422 });
  }
  if (!grounds?.trim() || grounds.trim().length < 20) {
    return NextResponse.json({ error: 'grounds must be at least 20 characters' }, { status: 422 });
  }

  await candidateStore.requestHumanReview(decisionId.trim(), grounds.trim());
  return NextResponse.json({ success: true }, { status: 201 });
}
