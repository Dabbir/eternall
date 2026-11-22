import { useState } from 'react';
import { locate } from '../../domain/time';
import { LIMITS, type Inscription, type ISODate, type Tone } from '../../domain/types';
import { validateInscription, type FieldErrors, type InscriptionInput } from '../../domain/validation';
import { formatLong, ordinal } from '../../lib/format';
import { createId } from '../../lib/id';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextArea, TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { TonePicker } from './TonePicker';

interface Props {
  existing?: Inscription;
  date?: ISODate;
  onClose: () => void;
}

export function InscriptionEditor({ existing, date, onClose }: Props) {
  const { profile, today, dispatch } = useProfileStore();
  const toast = useToast();
  const initial: InscriptionInput = existing
    ? { date: existing.date, title: existing.title, body: existing.body, tone: existing.tone }
    : { date: date ?? today, title: '', body: '', tone: '' };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof InscriptionInput>>({});
  const [confirm, setConfirm] = useState<null | 'discard' | 'delete'>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = <K extends keyof InscriptionInput>(k: K, v: InscriptionInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    setConfirm(null);
  };

  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  const save = () => {
    const r = validateInscription(form, profile, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    const now = new Date().toISOString();
    const inscription: Inscription = existing
      ? { ...existing, ...r.value, updatedAt: now }
      : { id: createId(), ...r.value, createdAt: now, updatedAt: now };
    dispatch({ type: 'inscription/upsert', inscription });
    const c = locate(profile.birthDate, inscription.date);
    toast({
      message: existing ? 'Inscription updated.' : `Inscribed into week ${(c?.week ?? 0) + 1} of your ${ordinal((c?.age ?? 0) + 1)} year.`,
      tone: 'seal',
    });
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    dispatch({ type: 'inscription/remove', id: existing.id });
    toast({ message: `“${existing.title}” removed.`, action: { label: 'Undo', run: () => dispatch({ type: 'inscription/upsert', inscription: existing }) } });
    onClose();
  };

  const footer =
    confirm === 'discard' ? (
      <div className="confirm-bar">
        <p>Discard what you’ve written?</p>
        <Button variant="quiet" onClick={() => setConfirm(null)}>Keep writing</Button>
        <Button variant="danger" onClick={onClose}>Discard</Button>
      </div>
    ) : confirm === 'delete' ? (
      <div className="confirm-bar">
        <p>Remove this inscription from your archive?</p>
        <Button variant="quiet" onClick={() => setConfirm(null)}>Cancel</Button>
        <Button variant="danger" icon="trash" onClick={remove}>Remove</Button>
      </div>
    ) : (
      <>
        {existing && <Button variant="quiet" icon="trash" onClick={() => setConfirm('delete')}>Remove</Button>}
        <span className="spacer" />
        <Button variant="quiet" onClick={requestClose}>Cancel</Button>
        <Button variant="primary" type="submit" form="inscription-form" icon="pen">{existing ? 'Save changes' : 'Inscribe'}</Button>
      </>
    );

  return (
    <Dialog
      open
      onClose={requestClose}
      title={existing ? 'Edit inscription' : 'Inscribe a memory'}
      eyebrow={isValidDate(form.date) ? formatLong(form.date) : 'A day you lived'}
      footer={footer}
      size="l"
    >
      <form
        id="inscription-form"
        className="editor-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
      >
        <TextField
          label="Title"
          className="input--title"
          placeholder="The night the power went out"
          value={form.title}
          maxLength={LIMITS.title}
          showCount
          autoFocus
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <div className="editor-form__row">
          <TextField
            label="Date"
            type="date"
            value={form.date}
            min={profile.birthDate}
            max={today}
            error={errors.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        <TonePicker value={form.tone as Tone | ''} onChange={(t) => set('tone', t)} error={errors.tone} />
        <TextArea
          label="What do you want to remember?"
          placeholder="Who was there, what was said, what the air smelled like…"
          value={form.body}
          rows={8}
          maxLength={LIMITS.inscriptionBody}
          showCount
          error={errors.body}
          hint={<span className="mono">⌘ / Ctrl + Enter to save</span>}
          onChange={(e) => set('body', e.target.value)}
        />
      </form>
    </Dialog>
  );
}

const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
