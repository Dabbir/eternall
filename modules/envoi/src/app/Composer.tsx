import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addYears,
  birthdayAt,
  createId,
  diffDays,
  formatCountdown,
  formatLong,
  formatWeekday,
  isValidISO,
  locate,
  ordinal,
  toISO,
  type FieldErrors,
  type ISODate,
} from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Icon, Seal } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import {
  DRAFT_PATH,
  LETTER_PATH,
  LIMITS,
  earliestOpening,
  fingerprintOf,
  latestOpening,
  validateLetter,
  type Letter,
  type LetterDraft,
  type LetterInput,
} from '../letters';
import { Postmark } from './Envelope';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A full sheet of letter paper. The draft is kept in the vault as you write, so nothing is ever lost. */
export function Composer({ prefill }: { prefill: Partial<LetterInput> }) {
  const house = useHouse();
  const { profile, today } = house;
  const drafts = useCollection<LetterDraft>(DRAFT_PATH).col;
  const letters = useCollection<Letter>(LETTER_PATH).col;
  const saved = drafts.get('current');
  const min = earliestOpening(today);
  const max = latestOpening(profile, today);
  const [form, setForm] = useState<LetterInput>(() => ({
    title: prefill.title ?? saved?.title ?? '',
    body: prefill.body ?? saved?.body ?? '',
    opensOn: prefill.opensOn && isValidISO(prefill.opensOn) && prefill.opensOn >= min ? prefill.opensOn : (saved?.opensOn ?? ''),
  }));
  const [errors, setErrors] = useState<FieldErrors<keyof LetterInput>>({});
  const [sealing, setSealing] = useState<Letter | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Keep the draft in the vault (debounced by the vault itself).
  useEffect(() => {
    if (sealing) return;
    if (!form.title && !form.body && !form.opensOn) return;
    drafts.put({ id: 'current', ...form });
  }, [form, sealing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => titleRef.current?.focus(), []);

  const presets = useMemo(() => {
    const age = profile ? (locate(profile.birthDate, today)?.age ?? 0) : null;
    const list: { label: string; date: ISODate }[] = [
      { label: 'In one year', date: addYears(today, 1) },
      { label: 'In five years', date: addYears(today, 5) },
      { label: 'In ten years', date: addYears(today, 10) },
    ];
    if (profile && age !== null) {
      const decade = Math.ceil((age + 1) / 10) * 10;
      list.push({ label: `Your ${ordinal(decade)} birthday`, date: toISO(birthdayAt(profile.birthDate, decade)) });
    }
    return list.filter((p) => p.date >= min && p.date <= max);
  }, [profile, today, min, max]);

  const set = <K extends keyof LetterInput>(k: K, v: LetterInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const seal = async () => {
    const r = validateLetter(form, profile, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    try {
      const contents = { ...r.value, sealedOn: today };
      const letter: Letter = { id: createId(), ...contents, fingerprint: await fingerprintOf(contents), openedAt: null };
      setSealing(letter);
      window.setTimeout(
        () => {
          letters.put(letter);
          drafts.remove('current');
          house.toast({ message: `Sealed until ${formatLong(letter.opensOn)}.`, tone: 'accent' });
          house.navigate(house.href('/'));
        },
        reduced() ? 300 : 2600,
      );
    } catch {
      setBusy(false);
      house.toast({ message: 'This browser couldn’t seal the letter. Your words are safe here; try a current browser.', tone: 'error' });
    }
  };

  usePrimaryAction(sealing ? null : { label: 'Seal letter', run: () => void seal() });

  if (sealing) {
    return (
      <div className="envoi-sealing" role="status" aria-live="polite">
        <div className="envoi-sealing__stage">
          <div className="envoi-sealing__sheet" aria-hidden="true">
            <span className="envoi-sealing__crease envoi-sealing__crease--1" />
            <span className="envoi-sealing__crease envoi-sealing__crease--2" />
          </div>
          <div className="envoi-sealing__envelope" aria-hidden="true">
            <div className="envoi-sealing__flap" />
            <div className="envoi-sealing__seal">
              <Seal fingerprint={sealing.fingerprint} initial={profile?.name ?? 'E'} size={88} />
            </div>
            <div className="envoi-sealing__postmark">
              <Postmark date={sealing.sealedOn} size={86} />
            </div>
          </div>
        </div>
        <p className="envoi-sealing__title">Sealed.</p>
        <p className="envoi-sealing__note">
          See you on {formatWeekday(sealing.opensOn)}, {formatLong(sealing.opensOn)}.
        </p>
        <p className="envoi-sealing__fp" title="SHA-256 fingerprint of the sealed letter">
          {sealing.fingerprint.slice(0, 16)}…
        </p>
      </div>
    );
  }

  const daysAway = isValidISO(form.opensOn) ? diffDays(today, form.opensOn) : null;
  const to = profile?.name ?? 'myself';

  return (
    <form
      className="envoi-compose"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void seal();
      }}
    >
      <div className="envoi-sheet">
        <fieldset className="envoi-address">
          <legend className="visually-hidden">Address</legend>
          <p className="envoi-address__line">
            <span className="envoi-address__k">To</span>
            <span className="envoi-address__v">{to}, in the future</span>
          </p>
          <div className="envoi-address__line">
            <label className="envoi-address__k" htmlFor="envoi-opens">
              On
            </label>
            <input
              id="envoi-opens"
              className="envoi-address__date"
              type="date"
              value={form.opensOn}
              min={min}
              max={max}
              aria-invalid={!!errors.opensOn || undefined}
              aria-describedby="envoi-opens-help"
              onChange={(e) => set('opensOn', e.target.value)}
            />
          </div>
          <div className="envoi-presets" role="group" aria-label="Quick opening dates">
            {presets.map((p) => (
              <button key={p.label} type="button" className={`envoi-chip ${form.opensOn === p.date ? 'is-on' : ''}`} aria-pressed={form.opensOn === p.date} onClick={() => set('opensOn', p.date)}>
                {p.label}
              </button>
            ))}
          </div>
          <p id="envoi-opens-help" className={errors.opensOn ? 'envoi-error' : 'envoi-address__help'} role={errors.opensOn ? 'alert' : undefined}>
            {errors.opensOn ??
              (daysAway !== null && daysAway > 0
                ? `Opens ${formatWeekday(form.opensOn)}, ${formatLong(form.opensOn)} — ${formatCountdown(today, form.opensOn)}.`
                : 'Choose the day this letter may be opened.')}
          </p>
        </fieldset>

        <label className="visually-hidden" htmlFor="envoi-title">
          Title
        </label>
        <input
          id="envoi-title"
          ref={titleRef}
          className="envoi-title-input"
          placeholder="Open when you’re forty"
          value={form.title}
          maxLength={LIMITS.title}
          aria-invalid={!!errors.title || undefined}
          onChange={(e) => set('title', e.target.value)}
        />
        {errors.title && (
          <p className="envoi-error" role="alert">
            {errors.title}
          </p>
        )}

        <label className="visually-hidden" htmlFor="envoi-body">
          Your letter
        </label>
        <textarea
          id="envoi-body"
          className="envoi-letter-input"
          placeholder={`Dear ${profile?.name ?? 'me'},\n\nBy the time you read this…`}
          value={form.body}
          maxLength={LIMITS.body}
          aria-invalid={!!errors.body || undefined}
          onChange={(e) => set('body', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void seal();
            }
          }}
        />
        {errors.body && (
          <p className="envoi-error" role="alert">
            {errors.body}
          </p>
        )}

        <footer className="envoi-sheet__foot">
          <p className="envoi-sheet__warning">
            <Icon name="lock" size={15} /> Once sealed, nobody can read or change it before it opens. Not even you.
          </p>
          <div className="envoi-sheet__actions">
            {(form.title || form.body) && (
              <Button
                variant="quiet"
                onClick={() => {
                  drafts.remove('current');
                  house.navigate(house.href('/'));
                }}
              >
                Discard draft
              </Button>
            )}
            <Button variant="accent" type="submit" busy={busy}>
              Seal letter
            </Button>
          </div>
        </footer>
      </div>
      <p className="envoi-compose__saved" aria-live="polite">
        {form.title || form.body ? 'Draft kept safely as you write.' : ''}
      </p>
    </form>
  );
}

