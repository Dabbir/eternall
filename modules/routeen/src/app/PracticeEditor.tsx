import { useState } from 'react';
import { createId, type FieldErrors, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, Segmented, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { routeen } from '../index';
import { LIMITS, PRACTICE_PATH, validatePractice, type Cadence, type Practice, type PracticeInput, type TimeOfDay } from '../practices';

const TIMES: readonly TimeOfDay[] = ['morning', 'midday', 'evening', 'anytime'];
const CADENCES = ['daily', 'times', 'weekly'] as const;

/** The editor's own state: the measure is three fields, all empty for no measure. */
interface Form {
  name: string;
  why: string;
  cadence: Cadence;
  startedOn: string;
  timeOfDay: TimeOfDay;
  unit: string;
  target: string;
  minimum: string;
}

const formOf = (p: Practice | undefined, today: ISODate): Form =>
  p
    ? { name: p.name, why: p.why, cadence: p.cadence, startedOn: p.startedOn, timeOfDay: p.timeOfDay ?? 'anytime', unit: p.measure?.unit ?? '', target: p.measure ? String(p.measure.target) : '', minimum: p.measure ? String(p.measure.minimum) : '' }
    : { name: '', why: '', cadence: { kind: 'daily' }, startedOn: today, timeOfDay: 'anytime', unit: '', target: '', minimum: '' };

const inputOf = (f: Form): PracticeInput => {
  const none = !f.unit.trim() && !f.target.trim() && !f.minimum.trim();
  const num = (s: string) => (s.trim() ? Number(s) : Number.NaN);
  return { name: f.name, why: f.why, cadence: f.cadence, startedOn: f.startedOn, timeOfDay: f.timeOfDay, measure: none ? null : { unit: f.unit, target: num(f.target), minimum: num(f.minimum) } };
};

/**
 * A practice in full (spec §4.2): the name (required), its time of day, how often, an optional measure
 * shown as a hint on the tiers, and why. One page, for a new practice and for an edit. Leaving with
 * changes asks first. Old `thread`, `pitch` and `instrument` fields are never written back.
 */
export function PracticeEditor({ existing, today, onClose }: { existing?: Practice; today: ISODate; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Practice>(PRACTICE_PATH);
  const [initial] = useState(() => formOf(existing, today));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof PracticeInput>>({});
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    const field: keyof PracticeInput = k === 'unit' || k === 'target' || k === 'minimum' ? 'measure' : (k as Exclude<K, 'unit' | 'target' | 'minimum'>);
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = () => {
    const r = validatePractice(inputOf(form), today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    col.put({ id: existing?.id ?? createId(), pausedOn: existing?.pausedOn ?? null, ...r.value });
    house.toast({ message: existing ? copy.toast.updated : copy.toast.added(r.value.name), tone: 'accent' });
    onClose();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => (dirty && !confirm ? setConfirm(true) : onClose());
  const kind = form.cadence.kind;

  return (
    <Dialog
      open
      onClose={close}
      className="rs-editor"
      eyebrow={`${routeen.name} · ${existing ? copy.editPractice : copy.editor.newTitle}`}
      title={existing ? existing.name : copy.editor.newTitle}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{copy.editor.discard}</p>
            <Button variant="quiet" onClick={() => setConfirm(false)}>
              {copy.editor.keepEditing}
            </Button>
            <Button variant="danger" onClick={onClose}>
              {copy.editor.discardYes}
            </Button>
          </div>
        ) : (
          <>
            <span className="spacer" />
            <Button variant="quiet" onClick={close}>
              {copy.editor.cancel}
            </Button>
            <Button variant="primary" type="submit" form="rs-form">
              {existing ? copy.editor.save : copy.editor.create}
            </Button>
          </>
        )
      }
    >
      <form
        id="rs-form"
        className="editor-form rs-editor__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField label={copy.nameLabel} className="rs-editor__name" placeholder={copy.namePlaceholder} autoFocus value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />

        <Segmented label={copy.editor.timeOfDay} hideLabel={false} options={TIMES.map((t) => ({ value: t, label: copy.times[t] }))} value={form.timeOfDay} onChange={(t) => set('timeOfDay', t)} />

        <fieldset className="rs-cadence">
          <legend>{copy.editor.cadence}</legend>
          {CADENCES.map((k) => (
            <label key={k} className="rs-choice">
              <input
                type="radio"
                name="cadence"
                checked={kind === k}
                onChange={() => set('cadence', k === 'daily' ? { kind: 'daily' } : k === 'times' ? { kind: 'times', n: 3 } : { kind: 'weekly', weekday: 5 })}
              />
              <span>{copy.editor.cadences[k]}</span>
            </label>
          ))}
          {form.cadence.kind === 'times' && (
            <label className="rs-inline">
              <span className="visually-hidden">{copy.editor.timesLabel}</span>
              <select value={form.cadence.n} onChange={(e) => set('cadence', { kind: 'times', n: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{' '}
              {copy.editor.timesSuffix}
            </label>
          )}
          {form.cadence.kind === 'weekly' && (
            <label className="rs-inline">
              <span className="visually-hidden">{copy.editor.weekdayLabel}</span>
              <select value={form.cadence.weekday} onChange={(e) => set('cadence', { kind: 'weekly', weekday: Number(e.target.value) })}>
                {copy.weekdays.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {errors.cadence && <p className="field__error">{errors.cadence}</p>}
        </fieldset>

        <fieldset className="rs-measure">
          <legend>{copy.editor.measure}</legend>
          <p className="field__hint">{copy.editor.measureHint}</p>
          <TextField label={copy.editor.unit} placeholder={copy.editor.unitPlaceholder} value={form.unit} maxLength={LIMITS.unit} onChange={(e) => set('unit', e.target.value)} />
          <TextField label={copy.editor.target} inputMode="decimal" value={form.target} onChange={(e) => set('target', e.target.value)} />
          <TextField label={copy.editor.minimum} inputMode="decimal" value={form.minimum} onChange={(e) => set('minimum', e.target.value)} />
          {errors.measure && (
            <p className="field__error" role="alert">
              {errors.measure}
            </p>
          )}
        </fieldset>

        <TextArea label={copy.editor.why} placeholder={copy.editor.whyPlaceholder} rows={3} value={form.why} maxLength={LIMITS.why} showCount error={errors.why} onChange={(e) => set('why', e.target.value)} />
        {existing && <TextField label={copy.editor.started} type="date" value={form.startedOn} error={errors.startedOn} onChange={(e) => set('startedOn', e.target.value)} />}
      </form>
    </Dialog>
  );
}
