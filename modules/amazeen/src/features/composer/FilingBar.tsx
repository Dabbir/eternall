import { useId } from 'react';
import { Icon, WeatherIcon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { MOOD_INFO, SECTION_INFO } from '../../domain/catalog';
import { MOODS, SECTIONS } from '../../domain/types';
import type { EntryMeta } from '../../domain/types';
import styles from './Composer.module.css';

interface FilingBarProps {
  meta: EntryMeta;
  onChange: (meta: EntryMeta) => void;
  submitLabel: string;
  disabled: boolean;
  errorCount: number;
}

/** Section, weather and cover controls plus the submit button. Uses native radios for free keyboard support. */
export function FilingBar({ meta, onChange, submitLabel, disabled, errorCount }: FilingBarProps) {
  const name = useId();
  return (
    <div className={styles.filing}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Section</legend>
        <div className={styles.chips}>
          {SECTIONS.map((s) => (
            <label key={s} className={styles.chip}>
              <input
                type="radio"
                name={`${name}-section`}
                value={s}
                checked={meta.section === s}
                onChange={() => onChange({ ...meta, section: s })}
              />
              <span>{SECTION_INFO[s].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Weather <span className={styles.legendValue}>{MOOD_INFO[meta.mood].label}</span>
        </legend>
        <div className={styles.moods}>
          {MOODS.map((m) => (
            <label key={m} className={styles.mood} title={MOOD_INFO[m].label}>
              <input type="radio" name={`${name}-mood`} value={m} checked={meta.mood === m} onChange={() => onChange({ ...meta, mood: m })} />
              <span>
                <WeatherIcon mood={m} size={24} />
                <span className="visually-hidden">{MOOD_INFO[m].label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.starToggle}>
        <input type="checkbox" checked={meta.starred} onChange={(e) => onChange({ ...meta, starred: e.target.checked })} />
        <span className={styles.starBox} aria-hidden="true">
          <Icon name="star" size={18} filled={meta.starred} />
        </span>
        <span>Cover-worthy</span>
      </label>

      <div className={styles.submitWrap}>
        {errorCount > 0 && (
          <span className={styles.submitError}>
            {errorCount === 1 ? '1 thing' : `${errorCount} things`} to fix
          </span>
        )}
        <button type="submit" className={`${ui.btn} ${ui.primary} ${styles.submit}`} disabled={disabled}>
          {submitLabel}
          <kbd className={styles.submitKbd}>⌘↵</kbd>
        </button>
      </div>
    </div>
  );
}
