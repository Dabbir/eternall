import { useState } from 'react';
import { createId, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { INSTRUMENTS, LIMITS, RITUAL_PATH, WEEKDAYS, nextPitch, validateRitual, type Cadence, type Ritual, type RitualInput } from '../rituals';
import { preview } from './audio';

const STEPS = ['name', 'cadence', 'why', 'sound'] as const;
const QUESTION = { name: 'What do you want to return to?', cadence: 'How often?', why: 'Why does it matter?', sound: 'Choose its sound.' } as const;

/** One question per step for a new ritual (docs/design/refrain.md §5.3); one page when editing. */
export function RitualEditor({ existing, onClose }: { existing?: Ritual; onClose(): void }) {
  const house = useHouse();
  const { items, col } = useCollection<Ritual>(RITUAL_PATH);
  const initial: RitualInput = existing
    ? { name: existing.name, why: existing.why, cadence: existing.cadence, instrument: existing.instrument, startedOn: existing.startedOn }
    : { name: '', why: '', cadence: { kind: 'daily' }, instrument: 'piano', startedOn: house.today };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof RitualInput>>({});
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const pitch = existing?.pitch ?? nextPitch(items);
  const show = (s: (typeof STEPS)[number]) => !!existing || STEPS[step] === s;
  const set = <K extends keyof RitualInput>(k: K, v: RitualInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = () => {
    const r = validateRitual(form, house.today);
    if (!r.ok) {
      setErrors(r.errors);
      if (!existing) setStep(r.errors.name ? 0 : r.errors.cadence ? 1 : r.errors.why ? 2 : 3);
      return;
    }
    col.put({ id: existing?.id ?? createId(), pitch, pausedOn: existing?.pausedOn ?? null, ...r.value });
    house.toast({ message: existing ? 'Ritual updated.' : `“${r.value.name}” joins the score.`, tone: 'accent' });
    onClose();
  };
  const next = () => {
    if (STEPS[step] === 'name' && !form.name.trim()) return setErrors({ name: 'A ritual needs a few words.' });
    if (step < STEPS.length - 1) setStep(step + 1);
    else save();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => (dirty && !confirm ? setConfirm(true) : onClose());
  const kind = form.cadence.kind;

  return (
    <Dialog
      open
      onClose={close}
      className="rf-editor"
      eyebrow={existing ? 'REFRAIN · Edit ritual' : `REFRAIN · New ritual · ${step + 1} of ${STEPS.length}`}
      title={existing ? existing.name : QUESTION[STEPS[step]!]}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>Discard this ritual?</p>
            <Button variant="quiet" onClick={() => setConfirm(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onClose}>
              Discard
            </Button>
          </div>
        ) : (
          <>
            {!existing && step > 0 && (
              <Button variant="quiet" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <span className="spacer" />
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="rf-form">
              {existing ? 'Save' : step < STEPS.length - 1 ? (STEPS[step] === 'why' && !form.why ? 'Skip' : 'Next') : 'Add to the score'}
            </Button>
          </>
        )
      }
    >
      <form
        id="rf-form"
        className="editor-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (existing) save();
          else next();
        }}
      >
        <svg className="rf-editor__staff" viewBox="0 0 400 40" aria-hidden="true" style={{ ['--p' as string]: (step + 1) / STEPS.length }}>
          {[4, 12, 20, 28, 36].map((y) => (
            <line key={y} x1="0" x2="400" y1={y} y2={y} />
          ))}
        </svg>
        {show('name') && <TextField label="The ritual" className="rf-editor__name" placeholder="Read 20 pages" autoFocus value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />}
        {show('cadence') && (
          <fieldset className="rf-cadence">
            <legend>How often</legend>
            {(['daily', 'times', 'weekly'] as const).map((k) => (
              <label key={k} className="rf-choice">
                <input
                  type="radio"
                  name="cadence"
                  checked={kind === k}
                  onChange={() => set('cadence', (k === 'daily' ? { kind: 'daily' } : k === 'times' ? { kind: 'times', n: 3 } : { kind: 'weekly', weekday: 5 }) as Cadence)}
                />
                <span>{k === 'daily' ? 'Every day' : k === 'times' ? 'Some days a week' : 'Once a week, on…'}</span>
              </label>
            ))}
            {form.cadence.kind === 'times' && (
              <label className="rf-inline">
                <select value={form.cadence.n} onChange={(e) => set('cadence', { kind: 'times', n: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>{' '}
                times a week, any days
              </label>
            )}
            {form.cadence.kind === 'weekly' && (
              <label className="rf-inline">
                <select value={form.cadence.weekday} onChange={(e) => set('cadence', { kind: 'weekly', weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {errors.cadence && <p className="field__error">{errors.cadence}</p>}
          </fieldset>
        )}
        {show('why') && <TextArea label="Why it matters (optional)" placeholder="In your own words." rows={3} value={form.why} maxLength={LIMITS.why} showCount error={errors.why} onChange={(e) => set('why', e.target.value)} />}
        {show('sound') && (
          <fieldset className="rf-sounds">
            <legend>Its sound on playback</legend>
            {INSTRUMENTS.map((i) => (
              <label key={i} className="rf-choice rf-choice--sound">
                <input
                  type="radio"
                  name="instrument"
                  checked={form.instrument === i}
                  onChange={() => {
                    set('instrument', i);
                    preview(i, pitch);
                  }}
                />
                <span className="rf-cap">{i}</span>
              </label>
            ))}
            <p className="field__hint">Choosing one plays a single note. Each ritual gets its own pitch, so they always sound good together.</p>
          </fieldset>
        )}
        {existing && <TextField label="Started" type="date" value={form.startedOn} error={errors.startedOn} onChange={(e) => set('startedOn', e.target.value)} />}
      </form>
    </Dialog>
  );
}
