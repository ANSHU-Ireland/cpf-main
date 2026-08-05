import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getAiLiteracy();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { role, trainingModule, assignee } = body;

  if (typeof role !== 'string' || role.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid role; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof trainingModule !== 'string' || trainingModule.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid training module; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof assignee !== 'string' || assignee.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid assignee; minimum 2 characters required.' },
      { status: 422 },
    );
  }

  const training = governanceStore.assignTraining(
    role.trim(),
    trainingModule.trim(),
    assignee.trim(),
  );
  return NextResponse.json(training, { status: 201 });
}
