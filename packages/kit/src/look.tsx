import { useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { accentOf, defaultLook, isDefaultLook, lookCss, lookTokens, readLook, withPreset, type Look, type LookMode, type LookSpec } from '@eternall/core';
import { useCollection } from '@eternall/vault';
import { useHouse } from './house';

/**
 * An app's personal look (docs/adr/0014): read from the vault record `<path>/look`, worn while the
 * app is open as one stylesheet for light and dark plus `data-look` on the app's root, both removed
 * when it closes. The default look adds nothing. Never localStorage.
 */
export function useAppLook(spec: LookSpec, path: string): { look: Look; setLook(look: Look): void } {
  const { col } = useCollection<Look>(path);
  const look = readLook(spec, col.get('look'));
  const css = isDefaultLook(spec, look) ? '' : lookCss(spec, look);
  useEffect(() => {
    if (!css) return;
    const style = document.createElement('style');
    style.dataset.look = spec.imprint;
    style.textContent = css;
    document.head.appendChild(style);
    document.body.dataset.look = '';
    return () => {
      style.remove();
      delete document.body.dataset.look;
    };
  }, [css, spec.imprint]);
  return { look, setLook: (next) => col.put(next) };
}

/** Light or dark as the house shows it now, so previews draw in the right mode. */
export function useLookMode(): LookMode {
  const read = (): LookMode => {
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

function Group({ legend, name, options, value, onChange, swatch }: { legend: string; name: string; options: [string, string][]; value: string; onChange(v: string): void; swatch?(v: string): string }) {
  return (
    <fieldset className="lookpicker__group">
      <legend>{legend}</legend>
      <div className="lookpicker__options">
        {options.map(([v, label]) => (
          <label key={v} className="lookpicker__option">
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {swatch && <span className="lookpicker__swatch" style={{ background: swatch(v) }} aria-hidden="true" />}
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The look picker, headless like the app bar (docs/adr/0014): ready-made looks drawn as small samples
 * in their own tokens, then four bounded choices, a preview slot and Reset with Undo. Every change is
 * applied and saved at once. Class hooks for each app's kit stylesheet:
 *
 *   .lookpicker  __presets  __preset  __sample  __label  __note  __group  __options  __option
 *   __swatch  __preview  __reset
 */
export function LookPicker({ spec, look, onChange, sample, preview, accentLegend = 'Accent' }: { spec: LookSpec; look: Look; onChange(look: Look): void; sample(presetId: string): ReactNode; preview?: ReactNode; accentLegend?: string }) {
  const house = useHouse();
  const mode = useLookMode();
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });
  const name = (k: string) => `look-${spec.imprint}-${k}`;
  return (
    <div className="lookpicker">
      <fieldset className="lookpicker__presets">
        <legend>Ready-made looks</legend>
        {Object.entries(spec.presets).map(([id, p]) => (
          <label key={id} className="lookpicker__preset" style={lookTokens(spec, { ...defaultLook(spec), preset: id, type: look.type }, mode) as CSSProperties}>
            <input type="radio" name={name('preset')} value={id} checked={look.preset === id} onChange={() => onChange(withPreset(look, id))} />
            <span className="lookpicker__sample" aria-hidden="true">
              {sample(id)}
            </span>
            <span className="lookpicker__label">{p.label}</span>{' '}
            <span className="lookpicker__note">{p.note}</span>
          </label>
        ))}
      </fieldset>
      <Group legend={accentLegend} name={name('accent')} value={accentOf(spec, look)} onChange={(v) => set({ accent: v })} options={Object.entries(spec.accents).map(([v, a]) => [v, a.label])} swatch={(v) => spec.accents[v]![mode][0]} />
      <Group legend="Typeface" name={name('type')} value={look.type} onChange={(v) => set({ type: v })} options={Object.entries(spec.types).map(([v, t]) => [v, t.label])} />
      <Group legend="Text size" name={name('size')} value={look.size} onChange={(v) => set({ size: v })} options={Object.entries(spec.sizes).map(([v, s]) => [v, s.label])} />
      <Group legend="Density" name={name('density')} value={look.density} onChange={(v) => set({ density: v })} options={Object.entries(spec.densities).map(([v, d]) => [v, d.label])} />
      {preview && <div className="lookpicker__preview">{preview}</div>}
      <button
        type="button"
        className="lookpicker__reset"
        disabled={isDefaultLook(spec, look)}
        onClick={() => {
          const before = look;
          onChange(defaultLook(spec));
          house.toast({ message: `Back to ${spec.presets[spec.defaultPreset]!.label}.`, action: { label: 'Undo', run: () => onChange(before) } });
        }}
      >
        Reset to {spec.presets[spec.defaultPreset]!.label}
      </button>
    </div>
  );
}
