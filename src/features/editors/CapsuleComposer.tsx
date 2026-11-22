import { useMemo, useState } from 'react';
import { fingerprintOf } from '../../domain/capsule';
import { addYears, birthdayAt, diffDays, horizonEnd, isValidISO, locate, parseISO, toISO } from '../../domain/time';
import { LIMITS, type Capsule, type ISODate } from '../../domain/types';
import { earliestOpening, validateCapsule, type CapsuleInput, type FieldErrors } from '../../domain/validation';
import { formatCountdown, formatLong, formatWeekday, ordinal } from '../../lib/format';
import { createId } from '../../lib/id';
import { prefersReducedMotion } from '../../lib/theme';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextArea, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Seal } from '../../components/ui/Seal';
import { useToast } from '../../components/ui/Toast';

interface Props {
  opensOn?: ISODate;
  onClose: () => void;
}

type Stage = 'write' | 'sealing';

export function CapsuleComposer({ opensOn, onClose }: Props) {
  const { profile, today, dispatch } = useProfileStore();
  const toast = useToast();
  const min = earliestOpening(today);
  const max = horizonEnd(profile.birthDate, profile.horizonYears);
  const initial: CapsuleInput = { title: '', body: '', opensOn: opensOn && parseISO(opensOn) >= parseISO(min) ? opensOn : '' };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof CapsuleInput>>({});
  const [stage, setStage] = useState<Stage>('write');
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pending, setPending] = useState<Capsule | null>(null);
  const dirty = form.title !== '' || form.body !== '';

  const presets = useMemo(() => {
    const age = locate(profile.birthDate, today)?.age ?? 0;
    const nextDecade = Math.ceil((age + 1) / 10) * 10;
    const list: { label: string; date: ISODate }[] = [
      { label: 'In one year', date: addYears(today, 1) },
      { label: 'In five years', date: addYears(today, 5) },
      { label: 'In ten years', date: addYears(today, 10) },
      { label: `Your ${ordinal(nextDecade)} birthday`, date: toISO(birthdayAt(profile.birthDate, nextDecade)) },
    ];
    return list.filter((p) => parseISO(p.date) >= parseISO(min) && parseISO(p.date) <= parseISO(max));
  }, [profile.birthDate, today, min, max]);

  const set = <K extends keyof CapsuleInput>(k: K, v: CapsuleInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    setConfirmDiscard(false);
  };

  const requestClose = () => {
    if (stage === 'sealing') return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const seal = async () => {
    const r = validateCapsule(form, profile, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    try {
      const contents = { ...r.value, sealedOn: today };
      const capsule: Capsule = { id: createId(), ...contents, fingerprint: await fingerprintOf(contents), openedAt: null };
      setPending(capsule);
      setStage('sealing');
      window.setTimeout(
        () => {
          dispatch({ type: 'capsule/add', capsule });
          toast({ message: `Sealed until ${formatLong(capsule.opensOn)}.`, tone: 'seal' });
          onClose();
        },
        prefersReducedMotion() ? 300 : 2100,
      );
    } catch {
      setBusy(false);
      toast({ message: 'This browser couldn’t seal the letter. Try a current browser over HTTPS.', tone: 'error' });
    }
  };

  const daysAway = isValidISO(form.opensOn) ? diffDays(today, form.opensOn) : null;

  if (stage === 'sealing' && pending) {
    return (
      <Dialog open onClose={requestClose} title="Sealing your letter" hideTitle size="stage">
        <div className="sealing" role="status">
          <div className="sealing__envelope">
            <div className="sealing__flap" />
            <Seal fingerprint={pending.fingerprint} initial={profile.name} size={96} className="sealing__seal" />
          </div>
          <p className="display sealing__title">Sealed.</p>
          <p className="muted">
            See you on {formatWeekday(pending.opensOn)}, {formatLong(pending.opensOn)}.
          </p>
          <p className="mono faint sealing__fp" title="SHA-256 fingerprint of the sealed letter">
            {pending.fingerprint.slice(0, 16)}…
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={requestClose}
      title="A letter to your future self"
      eyebrow="New capsule"
      size="l"
      footer={
        confirmDiscard ? (
          <div className="confirm-bar">
            <p>Throw this letter away?</p>
            <Button variant="quiet" onClick={() => setConfirmDiscard(false)}>Keep writing</Button>
            <Button variant="danger" onClick={onClose}>Discard</Button>
          </div>
        ) : (
          <>
            <p className="composer__warning">
              <Icon name="lock" size={16} /> Once sealed, nobody can read or change it before it opens. Not even you.
            </p>
            <span className="spacer" />
            <Button variant="quiet" onClick={requestClose}>Cancel</Button>
            <Button variant="seal" type="submit" form="capsule-form" busy={busy}>Seal letter</Button>
          </>
        )
      }
    >
      <form
        id="capsule-form"
        className="editor-form composer"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void seal();
        }}
      >
        <TextField
          label="Title"
          className="input--title"
          placeholder="Open when you’re forty"
          value={form.title}
          maxLength={LIMITS.title}
          showCount
          autoFocus
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <TextArea
          label="Your letter"
          className="input--letter"
          placeholder={`Dear ${profile.name},\n\nBy the time you read this…`}
          value={form.body}
          maxLength={LIMITS.capsuleBody}
          showCount
          error={errors.body}
          onChange={(e) => set('body', e.target.value)}
        />
        <fieldset className="composer__when">
          <legend className="field__label">When should it open?</legend>
          <div className="composer__presets">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip ${form.opensOn === p.date ? 'is-on' : ''}`}
                aria-pressed={form.opensOn === p.date}
                onClick={() => set('opensOn', p.date)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <TextField
            label="Or choose a date"
            type="date"
            value={form.opensOn}
            min={min}
            max={max}
            error={errors.opensOn}
            onChange={(e) => set('opensOn', e.target.value)}
          />
          {daysAway !== null && daysAway > 0 && !errors.opensOn && (
            <p className="composer__summary" aria-live="polite">
              Opens {formatWeekday(form.opensOn)}, <strong>{formatLong(form.opensOn)}</strong> — {formatCountdown(today, form.opensOn)}.
            </p>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
