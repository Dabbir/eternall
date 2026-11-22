import { useId } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** A radio group styled as a segmented control, with a sliding indicator. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = true,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const name = useId();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <fieldset className="segmented" style={{ ['--n' as string]: options.length, ['--i' as string]: index }}>
      <legend className={hideLabel ? 'visually-hidden' : 'eyebrow'}>{label}</legend>
      <span className="segmented__thumb" aria-hidden="true" />
      {options.map((o) => (
        <label key={o.value} className={`segmented__opt ${o.value === value ? 'is-on' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
