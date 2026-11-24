import { useRef, useState } from 'react';
import { createId, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { CLOSENESS, CLOSENESS_LABEL, LIMITS, PERSON_PATH, PHOTO_PATH, SEEN_PATH, validatePerson, type Person, type PersonInput, type Photo, type Seen } from './people';
import { shrinkPhoto } from './photo';
import { Pinned } from './Ceremony';

/** A card for the wall: name, group, closeness, how you met, a photo, dates to remember. */
export function PersonEditor({ existing, groups: drawers, onClose }: { existing?: Person | undefined; groups: string[]; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Person>(PERSON_PATH);
  const { items: seen, col: seenCol } = useCollection<Seen>(SEEN_PATH);
  const initial: PersonInput = existing
    ? { name: existing.name, drawer: existing.drawer, closeness: existing.closeness, howWeMet: existing.howWeMet, dates: existing.dates.length ? existing.dates : [{ label: 'Birthday', date: '', yearly: true }] }
    : { name: '', drawer: drawers[0] ?? 'Family', closeness: 'close', howWeMet: '', dates: [{ label: 'Birthday', date: '', yearly: true }] };
  const { col: photoCol } = useCollection<Photo>(PHOTO_PATH);
  const initialPhoto = existing ? photoCol.get(existing.id)?.src ?? null : null;
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'That image couldn’t be used.');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
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
    if (photo && photo !== initialPhoto) photoCol.put({ id, src: photo });
    else if (!photo && initialPhoto) photoCol.remove(id);
    house.toast({ message: existing ? 'Card updated.' : `${r.value.name} is pinned on the wall.`, tone: 'accent' });
    if (!existing) house.ceremony(<Pinned name={r.value.name} line={`Pinned · ${r.value.drawer || 'Unfiled'}`} />, 900);
    if (!existing) house.navigate(house.href(`/people/${id}`));
    onClose();
  };
  const remove = () => {
    if (!existing) return;
    const theirs = seen.filter((s) => s.personId === existing.id);
    const picture = photoCol.get(existing.id);
    col.remove(existing.id);
    for (const s of theirs) seenCol.remove(s.id);
    if (picture) photoCol.remove(existing.id);
    house.navigate(house.href('/people'));
    house.toast({ message: `${existing.name}’s card taken down.`, action: { label: 'Undo', run: () => { col.put(existing); for (const s of theirs) seenCol.put(s); if (picture) photoCol.put(picture); } } });
    onClose();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || photo !== initialPhoto;
  return (
    <Dialog
      open
      onClose={() => (dirty ? setConfirm('discard') : onClose())}
      className="pp-editor"
      eyebrow="People · The card"
      title={existing ? `Edit ${existing.name}’s card` : 'Pin a person'}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'remove' ? 'Take this card down, with the days you noted?' : 'Discard your changes?'}</p>
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
            <Button variant="primary" type="submit" form="pp-form">
              {existing ? 'Save' : 'Pin it'}
            </Button>
          </>
        )
      }
    >
      <form id="pp-form" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TextField label="Name" className="pp-editor__name" autoFocus value={form.name} maxLength={LIMITS.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        <TextField label="Group" list="pp-groups" placeholder="Family, Old friends, Workshop…" value={form.drawer} maxLength={LIMITS.drawer} error={errors.drawer} onChange={(e) => set('drawer', e.target.value)} />
        <datalist id="pp-groups">
          {drawers.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <fieldset className="pp-closeness">
          <legend>How close</legend>
          {CLOSENESS.map((c) => (
            <label key={c} className="pp-pill">
              <input type="radio" name="closeness" checked={form.closeness === c} onChange={() => set('closeness', c)} />
              <span>{CLOSENESS_LABEL[c]}</span>
            </label>
          ))}
          <p className="field__hint">Your choice alone; nobody else sees it.</p>
        </fieldset>
        <div className="pp-photoedit">
          <span className="pp-photoedit__label">Photo (optional)</span>
          <div className="pp-photoedit__row">
            {photo ? <img className="pp-photo pp-photo--edit" src={photo} alt={`Photo of ${form.name || 'this person'}`} /> : <span className="pp-photo pp-photo--empty" aria-hidden="true" />}
            <div className="pp-photoedit__actions">
              <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" aria-hidden="true" tabIndex={-1} onChange={(e) => void pick(e.target.files?.[0])} />
              <Button variant="ghost" size="s" busy={photoBusy} onClick={() => fileRef.current?.click()}>
                {photo ? 'Choose another' : 'Add a photo'}
              </Button>
              {photo && (
                <Button variant="quiet" size="s" onClick={() => setPhoto(null)}>
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          {photoError ? <p className="field__error">{photoError}</p> : <p className="field__hint">Made small on this device and encrypted with the rest of your vault.</p>}
        </div>
        <TextArea label="How you met (optional)" rows={2} value={form.howWeMet} maxLength={LIMITS.howWeMet} showCount error={errors.howWeMet} onChange={(e) => set('howWeMet', e.target.value)} />
        <fieldset className="pp-datesedit">
          <legend>Dates to remember</legend>
          {form.dates.map((d, i) => (
            <div key={i} className="pp-datesedit__row">
              <TextField label="Label" value={d.label} maxLength={LIMITS.dateLabel} onChange={(e) => setDate(i, { label: e.target.value })} />
              <TextField label="Date" type="date" value={d.date} onChange={(e) => setDate(i, { date: e.target.value })} />
              <label className="check">
                <input type="checkbox" checked={d.yearly} onChange={(e) => setDate(i, { yearly: e.target.checked })} />
                <span className="check__box" aria-hidden="true" />
                Every year
              </label>
              <button type="button" className="pp-datesedit__x" aria-label={`Remove ${d.label || 'this date'}`} onClick={() => set('dates', form.dates.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          {errors.dates && <p className="field__error">{errors.dates}</p>}
          {form.dates.length < LIMITS.dates && (
            <button type="button" className="pp-link" onClick={() => set('dates', [...form.dates, { label: '', date: '', yearly: true }])}>
              + Add a date
            </button>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
