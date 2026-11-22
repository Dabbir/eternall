import { useId, useState } from 'react';
import { CoverArt } from '../../components/CoverArt';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import ui from '../../components/ui.module.css';
import { INK_INFO } from '../../domain/catalog';
import { LIMITS } from '../../domain/entries';
import { headlineFor } from '../../domain/issues';
import { INKS } from '../../domain/types';
import type { Ink, Issue } from '../../domain/types';
import { useStore } from '../../state/store';
import styles from './Reader.module.css';

/**
 * Art-direct a cover: pick the ink and override the auto-generated headline. Previews live.
 * Mounted only while open, so its fields always start from the saved cover settings.
 */
export function CoverEditor({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const { data, setOverride } = useStore();
  const toast = useToast();
  const saved = data.overrides[issue.key];
  const [ink, setInk] = useState<Ink | null>(saved?.ink ?? null);
  const [headline, setHeadline] = useState(saved?.headline ?? '');
  const headlineId = useId();
  const autoHeadline = headlineFor(issue.coverStory);

  const tooLong = headline.trim().length > LIMITS.headline;
  const preview: Issue = { ...issue, ink: ink ?? issue.ink, headline: headline.trim() || autoHeadline };

  const save = (): void => {
    if (tooLong) return;
    const clean = headline.trim();
    setOverride(issue.key, ink || clean ? { ...(ink ? { ink } : {}), ...(clean ? { headline: clean } : {}) } : null);
    toast.push({ message: 'Cover updated.' });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Art-direct the cover"
      actions={
        <>
          <button
            type="button"
            className={`${ui.btn} ${ui.quiet}`}
            onClick={() => {
              setInk(null);
              setHeadline('');
            }}
          >
            Reset to automatic
          </button>
          <button type="button" className={`${ui.btn} ${ui.dark}`} onClick={save} disabled={tooLong}>
            Save cover
          </button>
        </>
      }
    >
      <div className={styles.editor}>
        <div className={styles.editorPreview}>
          <CoverArt issue={preview} masthead={data.magazine?.title ?? ''} decorative />
        </div>
        <div className={styles.editorFields}>
          <fieldset className={styles.inkField}>
            <legend className={ui.label}>Ink</legend>
            <div className={styles.swatches}>
              {INKS.map((option) => (
                <label key={option} className={styles.swatch} title={INK_INFO[option].label}>
                  <input type="radio" name="cover-ink" checked={(ink ?? issue.ink) === option} onChange={() => setInk(option)} />
                  <span style={{ background: `var(--riso-${option})` }} />
                  <span className="visually-hidden">{INK_INFO[option].label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className={ui.label} htmlFor={headlineId}>
              Cover line
            </label>
            <input
              id={headlineId}
              className={ui.input}
              value={headline}
              placeholder={autoHeadline}
              maxLength={LIMITS.headline + 20}
              aria-invalid={tooLong || undefined}
              onChange={(e) => setHeadline(e.target.value)}
            />
            {tooLong ? (
              <p className={ui.error} role="alert">
                Keep it under {LIMITS.headline} characters.
              </p>
            ) : (
              <p className={ui.hint}>Leave blank to use the cover story’s headline.</p>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
