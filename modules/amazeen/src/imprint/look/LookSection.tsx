import type { CSSProperties } from 'react';
import { useSyncExternalStore } from 'react';
import { useToast } from '../../components/Toast';
import { ACCENTS, DEFAULT_LOOK, DENSITIES, PRESETS, SIZES, TYPES, isDefaultLook, lookTokens, withPreset, type AccentId, type Look, type Mode, type PresetId } from './look';
import { useLook } from './LookContext';
import styles from './LookSection.module.css';

/** Light or dark as the house shows it now, so the preset cards preview in the right mode. */
function useMode(): Mode {
  const read = (): Mode => {
    const t = document.documentElement.dataset.theme;
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  return useSyncExternalStore(
    (cb) => {
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
      mq?.addEventListener('change', cb);
      return () => {
        mo.disconnect();
        mq?.removeEventListener('change', cb);
      };
    },
    read,
    () => 'light',
  );
}

function Choice<T extends string>({ legend, name, options, value, onChange, swatch }: { legend: string; name: string; options: { value: T; label: string; note?: string }[]; value: T; onChange(v: T): void; swatch?(v: T): string }) {
  return (
    <fieldset className={styles.choice}>
      <legend>{legend}</legend>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o.value} className={styles.option}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {swatch && <span className={styles.swatch} style={{ background: swatch(o.value) }} aria-hidden="true" />}
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * "Your edition's look" in the Office (docs/design/amazeen.md §13): ready-made looks as small covers,
 * then four bounded choices, all applied at once and kept in the vault. Never required before writing.
 */
export function LookSection() {
  const controls = useLook();
  const toast = useToast();
  const mode = useMode();
  if (!controls) return null;
  const { look, setLook } = controls;
  const accent = look.accent ?? PRESETS[look.preset].accent;
  const set = (patch: Partial<Look>) => setLook({ ...look, ...patch });
  const reset = () => {
    const before = look;
    setLook(DEFAULT_LOOK);
    toast.push({ message: 'Back to Press.', action: { label: 'Undo', onAction: () => setLook(before) } });
  };

  return (
    <section className={styles.section} aria-labelledby="s-look">
      <div className={styles.intro}>
        <h2 id="s-look">Your edition’s look</h2>
        <p>Make the magazine yours. Every choice applies at once and stays readable; day or night follows ETERNALL.</p>
      </div>

      <div className={styles.body}>
        <fieldset className={styles.presets}>
          <legend>Ready-made looks</legend>
          {(Object.keys(PRESETS) as PresetId[]).map((id) => {
            const tokens = lookTokens({ ...look, preset: id, accent: PRESETS[id].accent }, mode) as CSSProperties;
            return (
              <label key={id} className={styles.preset} style={tokens}>
                <input type="radio" name="look-preset" value={id} checked={look.preset === id} onChange={() => setLook(withPreset(look, id))} />
                <span className={styles.cover} aria-hidden="true">
                  <span className={styles.coverMast}>The Weekly Me</span>
                  <span className={styles.coverLine} />
                  <span className={styles.coverStory}>Hari Senin</span>
                </span>
                <span className={styles.presetLabel}>{PRESETS[id].label}</span>{' '}
                <span className={styles.presetNote}>{PRESETS[id].note}</span>
              </label>
            );
          })}
        </fieldset>

        <Choice<AccentId>
          legend="Accent"
          name="look-accent"
          value={accent}
          onChange={(v) => set({ accent: v })}
          options={(Object.keys(ACCENTS) as AccentId[]).map((v) => ({ value: v, label: ACCENTS[v].label }))}
          swatch={(v) => ACCENTS[v][mode][0]}
        />
        <Choice legend="Typeface" name="look-type" value={look.type} onChange={(v) => set({ type: v })} options={(Object.keys(TYPES) as (keyof typeof TYPES)[]).map((v) => ({ value: v, label: TYPES[v].label }))} />
        <Choice legend="Text size" name="look-size" value={look.size} onChange={(v) => set({ size: v })} options={(Object.keys(SIZES) as (keyof typeof SIZES)[]).map((v) => ({ value: v, label: SIZES[v].label }))} />
        <Choice legend="Density" name="look-density" value={look.density} onChange={(v) => set({ density: v })} options={(Object.keys(DENSITIES) as (keyof typeof DENSITIES)[]).map((v) => ({ value: v, label: DENSITIES[v].label }))} />

        <div className={styles.proof} aria-label="Preview">
          <p className={styles.proofKicker}>Cover story · Preview</p>
          <p className={styles.proofHead}>Issue No. 7 is taking shape.</p>
          <p className={styles.proofBody}>{TYPES[look.type].note}. This is how a paragraph of your week reads in this look, at this size and spacing.</p>
        </div>

        <button type="button" className={styles.reset} onClick={reset} disabled={isDefaultLook(look)}>
          Reset to Press
        </button>
      </div>
    </section>
  );
}
