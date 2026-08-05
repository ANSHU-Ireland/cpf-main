export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--color-soft)', fg: 'var(--color-ink)' },
  info: { bg: 'var(--color-blue-soft)', fg: 'var(--color-blue)' },
  success: { bg: 'var(--color-sage-soft)', fg: 'var(--color-sage)' },
  warning: { bg: 'var(--color-amber-soft)', fg: 'var(--color-amber)' },
  danger: { bg: 'var(--color-red-soft)', fg: 'var(--color-red)' },
  purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple)' },
};

export interface StatusBadgeProps {
  readonly tone?: BadgeTone;
  readonly children: string;
}

/** Non-interactive status pill; colour is paired with a text label (never colour alone). */
export function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps): React.JSX.Element {
  const { bg, fg } = TONE[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-unit)',
        background: bg,
        color: fg,
        borderRadius: 'var(--radius-control)',
        padding: 'calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 2)',
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
