import { NextRequest, NextResponse } from 'next/server';
import { projectPlatform } from '../../../lib/platform-api.server';
import { aiSystem, aiSystems, type PlatformAiSystem } from '../../../lib/governance-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAiSystem[]; total: number }, unknown>(
    { request, path: '/governance/ai-systems', method: 'GET' },
    aiSystems,
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemCode, name, providerLegalName, intendedPurpose, version } = body;

  if (
    typeof systemCode !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/.test(systemCode)
  ) {
    return NextResponse.json({ error: 'Invalid system code.' }, { status: 422 });
  }
  if (typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid name; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof providerLegalName !== 'string' || providerLegalName.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid provider legal name; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof intendedPurpose !== 'string' || intendedPurpose.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid intended purpose; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof version !== 'string' || version.trim().length < 1) {
    return NextResponse.json({ error: 'Invalid version.' }, { status: 422 });
  }
  return projectPlatform<PlatformAiSystem, unknown>(
    {
      request,
      path: '/governance/ai-systems',
      method: 'POST',
      body: {
        systemCode: systemCode.trim(),
        name: name.trim(),
        providerLegalName: providerLegalName.trim(),
        intendedPurpose: intendedPurpose.trim(),
        version: version.trim(),
      },
    },
    aiSystem,
    201,
  );
}
