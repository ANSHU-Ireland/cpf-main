import { NextResponse } from 'next/server';
import { candidateStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const { field, currentValue, correctedValue, reason } = body;

  if (!field?.trim() || field.trim().length < 2) {
    return NextResponse.json({ error: 'field must be at least 2 characters' }, { status: 422 });
  }
  if (!currentValue?.trim() || currentValue.trim().length < 2) {
    return NextResponse.json(
      { error: 'currentValue must be at least 2 characters' },
      { status: 422 },
    );
  }
  if (!correctedValue?.trim() || correctedValue.trim().length < 2) {
    return NextResponse.json(
      { error: 'correctedValue must be at least 2 characters' },
      { status: 422 },
    );
  }
  if (!reason?.trim() || reason.trim().length < 10) {
    return NextResponse.json({ error: 'reason must be at least 10 characters' }, { status: 422 });
  }

  await candidateStore.submitProfileCorrection(
    field.trim(),
    currentValue.trim(),
    correctedValue.trim(),
    reason.trim(),
  );
  return NextResponse.json({ success: true }, { status: 201 });
}
