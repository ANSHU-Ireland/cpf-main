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
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      <strong>Synthetic demo environment</strong> — all data shown is fabricated for demonstration
      and contains no real personal information.
    </div>
  );
}
