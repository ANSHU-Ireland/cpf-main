import { NextResponse } from 'next/server';
import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tickets = await candidateStore.getCandidateTickets();
  return NextResponse.json(tickets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { subject, category, description } = body;

  if (!subject?.trim() || subject.trim().length < 4) {
    return NextResponse.json({ error: 'subject must be at least 4 characters' }, { status: 422 });
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 422 });
  }
  if (!description?.trim() || description.trim().length < 20) {
    return NextResponse.json(
      { error: 'description must be at least 20 characters' },
      { status: 422 },
    );
  }

  const ticket = await candidateStore.createCandidateTicket(
    subject.trim(),
    category.trim(),
    description.trim(),
  );
  return NextResponse.json(ticket, { status: 201 });
}
