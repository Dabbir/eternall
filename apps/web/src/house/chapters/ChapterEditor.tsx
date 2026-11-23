import { useState } from 'react';
import { createId, type FieldErrors, type ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { CHAPTER_PATH, CLOTHS, LIMITS, validateChapter, type Chapter, type ChapterInput } from './chapters';

/** Setting a title page: name, dates, bookcloth and a line about the chapter. */
export function ChapterEditor({ existing, start, onClose }: { existing?: Chapter; start?: ISODate; onClose(): void }) {
  const house = useHouse();
  const { profile, today } = house;
  const { items, col } = useCollection<Chapter>(CHAPTER_PATH);
  const unused = CLOTHS.find((c) => !items.some((ch) => ch.cloth === c.id))?.id ?? 1;
  const initial: ChapterInput = existing
    ? { title: existing.title, start: existing.start, end: existing.end, cloth: existing.cloth, note: existing.note }
    : { title: '', start: start ?? '', end: null, cloth: unused, note: '' };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof ChapterInput>>({});
  const [confirm, setConfirm] = useState<null | 'delete' | 'discard'>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof ChapterInput>(k: K, v: ChapterInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, ...(k === 'end' ? { start: undefined } : {}) }));
    setConfirm(null);
  };

  const save = () => {
    const r = validateChapter(form, items.filter((c) => c.id !== existing?.id), profile, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    col.put({ id: existing?.id ?? createId(), ...r.value });
    house.toast({ message: existing ? 'Chapter updated.' : `“${r.value.title}” joins the shelf.`, tone: 'accent' });
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    col.remove(existing.id);
    house.toast({ message: `“${existing.title}” removed from the shelf.`, action: { label: 'Undo', run: () => col.put(existing) } });
    onClose();
  };

  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  return (
    <Dialog
      open
      onClose={requestClose}
      title={existing ? 'Edit chapter' : 'New chapter'}
      eyebrow="Chapters · Title page"
      className="folio-editor"
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'delete' ? 'Remove this chapter? Your memories stay where they are.' : 'Discard your changes?'}</p>
            <Button variant="quiet" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm === 'delete' ? remove : onClose}>
              {confirm === 'delete' ? 'Remove' : 'Discard'}
            </Button>
          </div>
        ) : (
          <>
            {existing && (
              <Button variant="quiet" icon="trash" onClick={() => setConfirm('delete')}>
                Remove
              </Button>
            )}
            <span className="spacer" />
            <Button variant="quiet" onClick={requestClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="folio-form">
              {existing ? 'Save' : 'Add to the shelf'}
            </Button>
          </>
        )
      }
    >
      <form
        id="folio-form"
        className="editor-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField label="Title" className="input--title folio-title-input" placeholder="The Lisbon years" value={form.title} maxLength={LIMITS.title} autoFocus error={errors.title} onChange={(e) => set('title', e.target.value)} />
        <div className="editor-form__row editor-form__row--2">
          <TextField label="Began" type="date" value={form.start} error={errors.start} onChange={(e) => set('start', e.target.value)} />
          <TextField
            label="Ended"
            type="date"
            value={form.end ?? ''}
            min={form.start || undefined}
            disabled={form.end === null}
            error={errors.end}
            hint={form.end === null ? 'Still being written.' : undefined}
            onChange={(e) => set('end', e.target.value)}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={form.end === null} onChange={(e) => set('end', e.target.checked ? null : today)} />
          <span className="check__box" aria-hidden="true" />
          This chapter is still being written
        </label>
        <fieldset className="folio-cloths">
          <legend>Bookcloth</legend>
          {CLOTHS.map((c) => (
            <label key={c.id} className="folio-cloth" style={{ ['--c' as string]: c.color }}>
              <input type="radio" name="cloth" checked={form.cloth === c.id} onChange={() => set('cloth', c.id)} />
              <span className="folio-cloth__swatch" aria-hidden="true" />
              <span className="folio-cloth__name">{c.name}</span>
            </label>
          ))}
        </fieldset>
        <TextArea label="A line about it" placeholder="Optional — what this chapter was about." rows={3} value={form.note} maxLength={LIMITS.note} showCount error={errors.note} onChange={(e) => set('note', e.target.value)} />
      </form>
    </Dialog>
  );
}
