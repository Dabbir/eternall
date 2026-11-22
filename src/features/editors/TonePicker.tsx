import { TONES, TONE_LABEL, type Tone } from '../../domain/types';

export function TonePicker({ value, onChange, error }: { value: Tone | ''; onChange: (t: Tone) => void; error?: string }) {
  return (
    <fieldset className="tone-picker" aria-describedby={error ? 'tone-err' : undefined}>
      <legend>How did it feel?</legend>
      {TONES.map((t) => (
        <label key={t} className={`tone-chip tone--${t}`}>
          <input type="radio" name="tone" value={t} checked={value === t} onChange={() => onChange(t)} />
          <span className="tone-dot" aria-hidden="true" />
          {TONE_LABEL[t]}
        </label>
      ))}
      {error && <p id="tone-err" className="field__error" role="alert" style={{ flexBasis: '100%' }}>{error}</p>}
    </fieldset>
  );
}
