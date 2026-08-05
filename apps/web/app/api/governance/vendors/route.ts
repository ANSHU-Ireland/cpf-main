import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getVendorEvidence();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { vendor, obligation } = body;

  if (typeof vendor !== 'string' || vendor.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid vendor; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof obligation !== 'string' || obligation.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid obligation; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const evidence = governanceStore.requestVendorEvidence(vendor.trim(), obligation.trim());
  return NextResponse.json(evidence, { status: 201 });
}
