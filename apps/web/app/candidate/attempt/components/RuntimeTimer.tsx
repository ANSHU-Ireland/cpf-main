'use client';

import { useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react';
import type { AttemptStatus } from '../../../lib/types';

/**
 * Renders the remaining time from a server-authoritative deadline. The client never owns the clock:
 * it anchors `serverNow`→local time once, then ticks a display only. Consequential expiry is decided
 * by the server on the next request.
 */
export function RuntimeTimer({
  deadlineAt,
  serverNow,
  status,
}: {
  deadlineAt: string;
  serverNow: string;
  status: AttemptStatus;
}): React.JSX.Element {
  const deadline = new Date(deadlineAt).getTime();
  const skew = Date.now() - new Date(serverNow).getTime();
  const [remaining, setRemaining] = useState<number>(deadline - (Date.now() - skew));

  useEffect(() => {
    const tick = (): void => setRemaining(deadline - (Date.now() - skew));
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, [deadline, skew]);

  const expired = status === 'expired' || remaining <= 0;
  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  const low = !expired && totalSeconds <= 5 * 60;

  return (
    <span
      role="timer"
      aria-live={low ? 'assertive' : 'off'}
      aria-label={expired ? 'Time expired' : `Time remaining ${mm} minutes ${ss} seconds`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-unit)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        color: expired ? 'var(--color-red)' : low ? 'var(--color-amber)' : 'var(--color-ink)',
      }}
    >
      <Clock size={16} weight="bold" aria-hidden />
      {expired ? 'Time up' : `${mm}:${ss}`}
    </span>
  );
}
