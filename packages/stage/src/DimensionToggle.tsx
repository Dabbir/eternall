import { IMMERSIVE_REASON_TEXT, type ImmersiveReason } from './capability';

/**
 * The switch between the flat page and the immersive view. When 3D isn't available it stays
 * visible but disabled, with the plain reason — never a mystery (docs/DESIGN.md §1.3).
 */
export function DimensionToggle({
  value,
  onChange,
  allowed,
  reason,
  label2d = 'Flat',
  label3d = '3D',
}: {
  value: '2d' | '3d';
  onChange(v: '2d' | '3d'): void;
  allowed: boolean;
  reason: ImmersiveReason;
  label2d?: string;
  label3d?: string;
}) {
  const why = reason === 'ok' ? undefined : IMMERSIVE_REASON_TEXT[reason];
  return (
    <div className="dimension-toggle" role="group" aria-label="View">
      <button type="button" className={value === '2d' ? 'is-on' : ''} aria-pressed={value === '2d'} onClick={() => onChange('2d')}>
        {label2d}
      </button>
      <button
        type="button"
        className={value === '3d' ? 'is-on' : ''}
        aria-pressed={value === '3d'}
        disabled={!allowed}
        title={why}
        aria-describedby={why ? 'dimension-why' : undefined}
        onClick={() => onChange('3d')}
      >
        {label3d}
      </button>
      {why && (
        <span id="dimension-why" className="visually-hidden">
          {why}
        </span>
      )}
    </div>
  );
}
