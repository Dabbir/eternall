import { useState } from 'react';
import { createId, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { KINDS, KIND_LABEL, LIMITS, UNDERLINE_PATH, WORK_PATH, validateUnderline, validateWork, type Landing, type Underline, type UnderlineInput, type Work, type WorkInput } from '../works';

/** A blank catalogue card in a typewriter carriage (docs/design/marginalia.md §5.3). */
export function WorkEditor({ existing, onClose }: { existing?: Work | undefined; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Work>(WORK_PATH);
  const { items: lines, col: lineCol } = useCollection<Underline>(UNDERLINE_PATH);
  const initial: WorkInput = existing
    ? { title: existing.title, by: existing.by, kind: existing.kind, started: existing.started ?? '', finished: existing.finished ?? '', landing: existing.landing }
    : { title: '', by: '', kind: 'book', started: house.today, finished: '', landing: null };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof WorkInput>>({});
  const [confirm, setConfirm] = useState<null | 'remove' | 'discard'>(null);
  const landingKind = !form.landing ? 'none' : 'stars' in form.landing ? 'stars' : 'word';
  const set = <K extends keyof WorkInput>(k: K, v: WorkInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const save = () => {
    const r = validateWork(form, house.today);
    if (!r.ok) return setErrors(r.errors);
    const id = existing?.id ?? createId();
    col.put({ id, createdAt: existing?.createdAt ?? new Date().toISOString(), ...r.value });
    house.toast({ message: existing ? 'Card retyped.' : `“${r.value.title}” is filed.`, tone: 'accent' });
    if (!existing) house.navigate(house.href(`/work/${id}`));
    onClose();
  };
  const remove = () => {
    if (!existing) return;
    const theirs = lines.filter((u) => u.workId === existing.id);
    col.remove(existing.id);
    for (const u of theirs) lineCol.remove(u.id);
    house.navigate(house.href('/'));
    house.toast({ message: `“${existing.title}” and its underlines removed.`, action: { label: 'Undo', run: () => { col.put(existing); for (const u of theirs) lineCol.put(u); } } });
    onClose();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => (dirty ? setConfirm('discard') : onClose());
  return (
    <Dialog
      open
      onClose={close}
      className="mg-editor"
      eyebrow="MARGINALIA · Catalogue card"
      title={existing ? 'Retype the card' : 'Add a work'}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'remove' ? 'Remove this work and all its underlines?' : 'Discard this card?'}</p>
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
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="mg-work">
              {existing ? 'Save' : 'File it'}
            </Button>
          </>
        )
      }
    >
      <form id="mg-work" className="editor-form mg-carriage" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <span className="mg-card__rule" aria-hidden="true" />
        <TextField label="Title" autoFocus value={form.title} maxLength={LIMITS.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
        <TextField label="By (optional)" placeholder="Virginia Woolf" value={form.by} maxLength={LIMITS.by} error={errors.by} onChange={(e) => set('by', e.target.value)} />
        <fieldset className="mg-kinds">
          <legend>Kind</legend>
          {KINDS.map((k) => (
            <label key={k} className="mg-pill">
              <input type="radio" name="kind" checked={form.kind === k} onChange={() => set('kind', k)} />
              <span>{KIND_LABEL[k]}</span>
            </label>
          ))}
        </fieldset>
        <div className="editor-form__row editor-form__row--2">
          <TextField label="Started (optional)" type="date" value={form.started} error={errors.started} onChange={(e) => set('started', e.target.value)} />
          <TextField label="Finished (optional)" type="date" value={form.finished} min={form.started || undefined} error={errors.finished} onChange={(e) => set('finished', e.target.value)} />
        </div>
        <fieldset className="mg-kinds">
          <legend>How it landed (optional)</legend>
          {(['none', 'stars', 'word'] as const).map((k) => (
            <label key={k} className="mg-pill">
              <input type="radio" name="landing" checked={landingKind === k} onChange={() => set('landing', (k === 'none' ? null : k === 'stars' ? { stars: 4 } : { word: '' }) as Landing)} />
              <span>{k === 'none' ? 'Not yet' : k === 'stars' ? 'Stars' : 'One word'}</span>
            </label>
          ))}
          {form.landing && 'stars' in form.landing && (
            <div className="mg-stars" role="radiogroup" aria-label="Stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={(form.landing as { stars: number }).stars === n} aria-label={`${n} of 5`} className={(form.landing as { stars: number }).stars >= n ? 'is-on' : ''} onClick={() => set('landing', { stars: n })}>
                  ★
                </button>
              ))}
            </div>
          )}
          {form.landing && 'word' in form.landing && <TextField label="The word" placeholder="tidal" value={form.landing.word} maxLength={LIMITS.word} onChange={(e) => set('landing', { word: e.target.value })} />}
          {errors.landing && <p className="field__error">{errors.landing}</p>}
        </fieldset>
        <p className="field__hint">Nothing is looked up online; everything on this card is typed by you.</p>
      </form>
    </Dialog>
  );
}

export function UnderlineEditor({ work, existing, onSaved, onClose }: { work: Work; existing?: Underline | undefined; onSaved(id: string): void; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Underline>(UNDERLINE_PATH);
  const initial: UnderlineInput = existing ? { text: existing.text, locator: existing.locator, note: existing.note, offered: existing.offered } : { text: '', locator: '', note: '', offered: false };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof UnderlineInput>>({});
  const [confirm, setConfirm] = useState<null | 'remove' | 'discard'>(null);
  const overheard = house.isEnabled('amazeen');
  const set = <K extends keyof UnderlineInput>(k: K, v: UnderlineInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const save = () => {
    const r = validateUnderline(form);
    if (!r.ok) return setErrors(r.errors);
    const id = existing?.id ?? createId();
    col.put({ id, workId: work.id, createdAt: existing?.createdAt ?? new Date().toISOString(), ...r.value });
    onSaved(id);
    house.toast({ message: existing ? 'Underline updated.' : 'Underlined.', tone: 'accent' });
    onClose();
  };
  const remove = () => {
    if (!existing) return;
    col.remove(existing.id);
    house.toast({ message: 'Underline removed.', action: { label: 'Undo', run: () => col.put(existing) } });
    onClose();
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const close = () => (dirty ? setConfirm('discard') : onClose());
  return (
    <Dialog
      open
      onClose={close}
      className="mg-editor"
      eyebrow={`MARGINALIA · ${work.title}`}
      title={existing ? 'Edit the underline' : 'Add an underline'}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>{confirm === 'remove' ? 'Remove this underline?' : 'Discard this passage?'}</p>
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
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="mg-line">
              {existing ? 'Save' : 'Underline it'}
            </Button>
          </>
        )
      }
    >
      <form id="mg-line" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TextArea label="The passage" className="mg-editor__passage" rows={4} autoFocus value={form.text} maxLength={LIMITS.text} showCount error={errors.text} hint="A passage, never a whole text." onChange={(e) => set('text', e.target.value)} />
        <TextField label="Where (optional)" placeholder="p. 112 · 01:14:03 · track 4" value={form.locator} maxLength={LIMITS.locator} error={errors.locator} onChange={(e) => set('locator', e.target.value)} />
        <TextArea label="In the margin (optional)" rows={3} value={form.note} maxLength={LIMITS.note} showCount error={errors.note} onChange={(e) => set('note', e.target.value)} />
        {overheard && (
          <label className="check">
            <input type="checkbox" checked={form.offered} onChange={(e) => set('offered', e.target.checked)} />
            <span className="check__box" aria-hidden="true" />
            Offer it to AMAZEEN’s “Overheard” page
          </label>
        )}
      </form>
    </Dialog>
  );
}
