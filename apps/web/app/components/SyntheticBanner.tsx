/**
 * Persistent, non-dismissible marker that this deployment serves synthetic demo data only.
 * Required by the build contract's data-integrity invariant (no real personal data in demo).
 */
export function SyntheticBanner(): React.JSX.Element {
  return (
    <div
      role="note"
      aria-label="Environment notice"
      style={{
        background: 'var(--color-amber-soft)',
        color: 'var(--color-amber)',
        borderBottom: '1px solid var(--color-line)',
        padding: 'calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 4)',
        fontSize: '0.85rem',
        textAlign: 'center',
      }}
    >
      <strong>Synthetic demo environment</strong> — all data shown is fabricated for demonstration
      and contains no real personal information.
    </div>
  );
}
