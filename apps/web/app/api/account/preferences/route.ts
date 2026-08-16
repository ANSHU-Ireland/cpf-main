import { forwardPlatform } from '../../../lib/platform-api.server';
import type { PreferencesView } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const THEMES = new Set<PreferencesView['theme']>(['system', 'light', 'dark', 'high_contrast']);
const DENSITIES = new Set<PreferencesView['density']>(['comfortable', 'compact']);

type WritablePreferences = { -readonly [K in keyof PreferencesView]?: PreferencesView[K] };

export function GET(request: Request): Promise<Response> {
  return forwardPlatform({ request, path: '/me/preferences', method: 'GET' });
}

export async function PATCH(request: Request): Promise<Response> {
  let body: Partial<PreferencesView>;
  try {
    body = (await request.json()) as Partial<PreferencesView>;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const patch: WritablePreferences = {};
  if (body.theme !== undefined) {
    if (!THEMES.has(body.theme)) {
      return Response.json({ error: 'Unsupported theme value.' }, { status: 422 });
    }
    patch.theme = body.theme;
  }
  if (body.density !== undefined) {
    if (!DENSITIES.has(body.density)) {
      return Response.json({ error: 'Unsupported density value.' }, { status: 422 });
    }
    patch.density = body.density;
  }
  if (typeof body.reducedMotion === 'boolean') patch.reducedMotion = body.reducedMotion;
  if (typeof body.locale === 'string' && body.locale.trim() !== '') patch.locale = body.locale;
  if (typeof body.timezone === 'string' && body.timezone.trim() !== '') {
    patch.timezone = body.timezone;
  }

  return forwardPlatform({ request, path: '/me/preferences', method: 'PUT', body: patch });
}
