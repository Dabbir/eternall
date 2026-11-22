import { useState } from 'react';
import { createId, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { CLOSENESS, CLOSENESS_LABEL, LIMITS, PERSON_PATH, SEEN_PATH, validatePerson, type Person, type PersonInput, type Seen } from '../people';

/** Printing a card: name, drawer, closeness, how you met, dates to remember. */
export function PersonEditor({ existing, drawers, onClose }: { existing?: Person | undefined; drawers: string[]; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Person>(PERSON_PATH);
  const { items: seen, col: seenCol } = useCollection<Seen>(SEEN_PATH);
  const initial: PersonInput = existing
    ? { name: existing.name, drawer: existing.drawer, closeness: existing.closeness, howWeMet: existing.howWeMet, dates: existing.dates.length ? existing.dates : [{ label: 'Birthday', date: '', yearly: true }] }
    : { name: '', drawer: drawers[0] ?? 'Family', closeness: 'close', howWeMet: '', dates: [{ label: 'Birthday', date: '', yearly: true }] };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof PersonInput>>({});
  const [confirm, setConfirm] = useState<null | 'remove' | 'discard'>(null);
  const set = <K extends keyof PersonInput>(k: K, v: PersonInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setDate = (i: number, patch: Partial<PersonInput['dates'][number]>) => set('dates', form.dates.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const save = () => {
    const r = validatePerson(form);
    if (!r.ok) return setErrors(r.errors);
    const id = existing?.id ?? createId();
    col.put({ id, createdAt: existing?.createdAt ?? new Date().toISOString(), ...r.value });
    house.toast({ message: existing ? 'Card updated.' : `${r.value.name} joins the card file.`, tone: 'accent' });
    if (!existing) house.navigate(house.href(`/person/${id}`));
    onClose();
  };
  const remove = () => {
    if (!existing) return;
    const theirs = seen.filter((s) => s.personId === existing.id);
    col.remove(existing.id);
    for (const s of theirs) seenCol.remove(s.id);
    house.navigate(house.href('/'));
    house.toast({ message: `${existing.name}’s card removed.`, action: { label: 'Undo', run: () => { col.put(existing); for (const s of theirs) seenCol.put(s); } } });
    onClose();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  return (
    <Dialog
      open
      onClose={() => (dirty ? setConfirm('discard') : onClose())}
      className="kd-editor"
      eyebrow="KINDRED · The card"
      title={existing ? `Edit ${existing.name}’s card` : 'Add a person'}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'remove' ? 'Remove this card and the days you noted?' : 'Discard your changes?'}</p>
            <Button variant="quiet" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm === 'remove' ? remove : onClose}>
              {confirm === 'remove' ? 'Remove' : 'Discard'}
            </Button>
          </div>
        ) : (
          <>
            {existing && (
              <Button variant="quiet" icon="trash" onClick={() => setConfirm('remove')}>
                Remove
              </Button>
            )}
            <span className="spacer" />
            <Button variant="quiet" onClick={() => (dirty ? setConfirm('discard') : onClose())}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="kd-form">
              {existing ? 'Save' : 'Add to the file'}
            </Button>
          </>
        )
      }
    >
      <form id="kd-form" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TextField label="Name" className="kd-editor__name" autoFocus value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        <TextField label="Drawer" list="kd-drawers" placeholder="Family, Old friends, Workshop…" value={form.drawer} maxLength={LIMITS.drawer} error={errors.drawer} onChange={(e) => set('drawer', e.target.value)} />
        <datalist id="kd-drawers">
          {drawers.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <fieldset className="kd-closeness">
          <legend>How close</legend>
          {CLOSENESS.map((c) => (
            <label key={c} className="kd-pill">
              <input type="radio" name="closeness" checked={form.closeness === c} onChange={() => set('closeness', c)} />
              <span>{CLOSENESS_LABEL[c]}</span>
            </label>
          ))}
          <p className="field__hint">Your choice alone; it sets how bright they are in the constellation.</p>
        </fieldset>
        <TextArea label="How you met (optional)" rows={2} value={form.howWeMet} maxLength={LIMITS.howWeMet} showCount error={errors.howWeMet} onChange={(e) => set('howWeMet', e.target.value)} />
        <fieldset className="kd-datesedit">
          <legend>Dates to remember</legend>
          {form.dates.map((d, i) => (
            <div key={i} className="kd-datesedit__row">
              <TextField label="Label" value={d.label} maxLength={LIMITS.dateLabel} onChange={(e) => setDate(i, { label: e.target.value })} />
              <TextField label="Date" type="date" value={d.date} onChange={(e) => setDate(i, { date: e.target.value })} />
              <label className="check">
                <input type="checkbox" checked={d.yearly} onChange={(e) => setDate(i, { yearly: e.target.checked })} />
                <span className="check__box" aria-hidden="true" />
                Every year
              </label>
              <button type="button" className="kd-datesedit__x" aria-label={`Remove ${d.label || 'this date'}`} onClick={() => set('dates', form.dates.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          {errors.dates && <p className="field__error">{errors.dates}</p>}
          {form.dates.length < LIMITS.dates && (
            <button type="button" className="kd-link" onClick={() => set('dates', [...form.dates, { label: '', date: '', yearly: true }])}>
              + Add a date
            </button>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
