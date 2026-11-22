import { useState } from 'react';
import { INKS, LIMITS, type Chapter, type ISODate } from '../../domain/types';
import { validateChapter, type ChapterInput, type FieldErrors } from '../../domain/validation';
import { horizonEnd } from '../../domain/time';
import { createId } from '../../lib/id';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextArea, TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';

const INK_LABEL: Record<(typeof INKS)[number], string> = {
  ochre: 'Ochre', moss: 'Moss', tide: 'Tide', plum: 'Plum', clay: 'Clay', slate: 'Slate',
};

export function ChapterEditor({ existing, start, onClose }: { existing?: Chapter; start?: ISODate; onClose: () => void }) {
  const { profile, today, data, dispatch } = useProfileStore();
  const toast = useToast();
  const unusedInk = INKS.find((i) => !data.chapters.some((c) => c.ink === i)) ?? 'ochre';
  const initial: ChapterInput = existing
    ? { title: existing.title, start: existing.start, end: existing.end, ink: existing.ink, note: existing.note }
    : { title: '', start: start ?? '', end: null, ink: unusedInk, note: '' };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof ChapterInput>>({});
  const [confirm, setConfirm] = useState<null | 'delete' | 'discard'>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const max = horizonEnd(profile.birthDate, profile.horizonYears);

  const set = <K extends keyof ChapterInput>(k: K, v: ChapterInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, ...(k === 'end' ? { start: undefined } : {}) }));
    setConfirm(null);
  };

  const save = () => {
    const others = data.chapters.filter((c) => c.id !== existing?.id);
    const r = validateChapter(form, others, profile, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    dispatch({ type: 'chapter/upsert', chapter: { id: existing?.id ?? createId(), ...r.value } });
    toast({ message: existing ? 'Chapter updated.' : `“${r.value.title}” added to your story.`, tone: 'seal' });
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    dispatch({ type: 'chapter/remove', id: existing.id });
    toast({ message: `“${existing.title}” removed.`, action: { label: 'Undo', run: () => dispatch({ type: 'chapter/upsert', chapter: existing }) } });
    onClose();
  };

  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  return (
    <Dialog
      open
      onClose={requestClose}
      title={existing ? 'Edit chapter' : 'Name a chapter'}
      eyebrow="Chapters"
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'delete' ? 'Remove this chapter? Your memories stay.' : 'Discard your changes?'}</p>
            <Button variant="quiet" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirm === 'delete' ? remove : onClose}>{confirm === 'delete' ? 'Remove' : 'Discard'}</Button>
          </div>
        ) : (
          <>
            {existing && <Button variant="quiet" icon="trash" onClick={() => setConfirm('delete')}>Remove</Button>}
            <span className="spacer" />
            <Button variant="quiet" onClick={requestClose}>Cancel</Button>
            <Button variant="primary" type="submit" form="chapter-form">{existing ? 'Save' : 'Add chapter'}</Button>
          </>
        )
      }
    >
      <form
        id="chapter-form"
        className="editor-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField
          label="Title"
          className="input--title"
          placeholder="The Lisbon years"
          value={form.title}
          maxLength={LIMITS.chapterTitle}
          autoFocus
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <div className="editor-form__row editor-form__row--2">
          <TextField label="Began" type="date" value={form.start} min={profile.birthDate} max={max} error={errors.start} onChange={(e) => set('start', e.target.value)} />
          <TextField
            label="Ended"
            type="date"
            value={form.end ?? ''}
            min={form.start || profile.birthDate}
            max={max}
            disabled={form.end === null}
            error={errors.end}
            hint={form.end === null ? 'Still being written.' : undefined}
            onChange={(e) => set('end', e.target.value)}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.end === null}
            onChange={(e) => set('end', e.target.checked ? null : today)}
          />
          <span className="check__box" aria-hidden="true" />
          This chapter is still going
        </label>
        <fieldset className="tone-picker">
          <legend>Ink</legend>
          {INKS.map((ink) => (
            <label key={ink} className={`tone-chip ink--${ink}`}>
              <input type="radio" name="ink" value={ink} checked={form.ink === ink} onChange={() => set('ink', ink)} />
              <span className="tone-dot" aria-hidden="true" />
              {INK_LABEL[ink]}
            </label>
          ))}
        </fieldset>
        <TextArea
          label="A line about it"
          placeholder="Optional — what this chapter was about."
          rows={3}
          value={form.note}
          maxLength={LIMITS.chapterNote}
          showCount
          error={errors.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </form>
    </Dialog>
  );
}
