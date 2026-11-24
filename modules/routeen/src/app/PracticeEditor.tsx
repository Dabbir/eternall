import { useState } from 'react';
import { createId, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { DYES, LIMITS, PATTERNS, PRACTICE_PATH, WEEKDAYS, nextThread, threadOf, validatePractice, type Cadence, type Practice, type PracticeInput } from '../practices';

const STEPS = ['name', 'cadence', 'why', 'thread'] as const;
const QUESTION = { name: 'What do you want to return to?', cadence: 'How often?', why: 'Why does it matter?', thread: 'Choose its thread.' } as const;
const DYE_LABEL: Record<(typeof DYES)[number], string> = { indigo: 'Indigo', madder: 'Madder', weld: 'Weld', walnut: 'Walnut', lichen: 'Lichen', iron: 'Iron' };

/** One question per step for a new practice (docs/design/routeen.md §5); one page when editing. */
export function PracticeEditor({ existing, onClose }: { existing?: Practice; onClose(): void }) {
  const house = useHouse();
  const { items, col } = useCollection<Practice>(PRACTICE_PATH);
  const initial: PracticeInput = existing
    ? { name: existing.name, why: existing.why, cadence: existing.cadence, startedOn: existing.startedOn }
    : { name: '', why: '', cadence: { kind: 'daily' }, startedOn: house.today };
  const [form, setForm] = useState(initial);
  const [thread, setThread] = useState(existing ? threadOf(existing) : nextThread(items));
  const [errors, setErrors] = useState<FieldErrors<keyof PracticeInput>>({});
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const show = (s: (typeof STEPS)[number]) => !!existing || STEPS[step] === s;
  const set = <K extends keyof PracticeInput>(k: K, v: PracticeInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = () => {
    const r = validatePractice(form, house.today);
    if (!r.ok) {
      setErrors(r.errors);
      if (!existing) setStep(r.errors.name ? 0 : r.errors.cadence ? 1 : 2);
      return;
    }
    col.put({ id: existing?.id ?? createId(), thread, pausedOn: existing?.pausedOn ?? null, ...r.value });
    house.toast({ message: existing ? 'Practice updated.' : `“${r.value.name}” is on the loom.`, tone: 'accent' });
    onClose();
  };
  const next = () => {
    if (STEPS[step] === 'name' && !form.name.trim()) return setErrors({ name: 'A practice needs a few words.' });
    if (step < STEPS.length - 1) setStep(step + 1);
    else save();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || (existing ? thread !== threadOf(existing) : false);
  const close = () => (dirty && !confirm ? setConfirm(true) : onClose());
  const kind = form.cadence.kind;

  return (
    <Dialog
      open
      onClose={close}
      className="rt-editor"
      eyebrow={existing ? 'ROUTEEN · Edit practice' : `ROUTEEN · New practice · ${step + 1} of ${STEPS.length}`}
      title={existing ? existing.name : QUESTION[STEPS[step]!]}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>Discard this practice?</p>
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
            <Button variant="primary" type="submit" form="rt-form">
              {existing ? 'Save' : step < STEPS.length - 1 ? (STEPS[step] === 'why' && !form.why ? 'Skip' : 'Next') : 'Put it on the loom'}
            </Button>
          </>
        )
      }
    >
      <form
        id="rt-form"
        className="editor-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (existing) save();
          else next();
        }}
      >
        {!existing && (
          <div className="rt-editor__progress" aria-hidden="true" style={{ ['--p' as string]: (step + 1) / STEPS.length }}>
            <span />
          </div>
        )}
        {show('name') && <TextField label="The practice" className="rt-editor__name" placeholder="Read 20 pages" autoFocus value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />}
        {show('cadence') && (
          <fieldset className="rt-cadence">
            <legend>How often</legend>
            {(['daily', 'times', 'weekly'] as const).map((k) => (
              <label key={k} className="rt-choice">
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
              <label className="rt-inline">
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
              <label className="rt-inline">
                <span className="visually-hidden">Day of the week</span>
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
        {show('thread') && (
          <fieldset className="rt-threads">
            <legend>Its thread</legend>
            {DYES.map((d, i) => (
              <label key={d} className="rt-choice rt-choice--thread">
                <input type="radio" name="thread" checked={thread === i} onChange={() => setThread(i)} />
                <span className={`rt-swatch rt-dye--${d} rt-pattern--${PATTERNS[i]}`} aria-hidden="true" />
                <span>
                  {DYE_LABEL[d]} · {PATTERNS[i]}
                </span>
              </label>
            ))}
            <p className="field__hint">Each thread has its own colour and its own weave, so they stay told apart in the cloth.</p>
          </fieldset>
        )}
        {existing && <TextField label="Started" type="date" value={form.startedOn} error={errors.startedOn} onChange={(e) => set('startedOn', e.target.value)} />}
      </form>
    </Dialog>
  );
}
