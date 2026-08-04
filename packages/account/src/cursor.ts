/** Generic opaque keyset cursor over a (timestamp, id) ordering. */
export interface KeysetCursor {
  readonly ts: string;
  readonly id: string;
}

/** Encodes a keyset position as a URL-safe opaque token. */
export function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/** Decodes an opaque cursor token; returns `null` when absent or malformed. */
export function decodeCursor(raw: string): KeysetCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.ts === 'string' && typeof rec.id === 'string') {
      return { ts: rec.ts, id: rec.id };
    }
    return null;
  } catch {
    return null;
  }
}
