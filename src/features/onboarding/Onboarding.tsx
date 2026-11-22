import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildLifeline } from '../../domain/lifeline';
import { locate } from '../../domain/time';
import { EMPTY_DATA, LIMITS, type Profile } from '../../domain/types';
import { validateProfile, type FieldErrors, type ProfileInput } from '../../domain/validation';
import { formatNumber, ordinal } from '../../lib/format';
import { prefersReducedMotion } from '../../lib/theme';
import { useStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Wordmark } from '../../components/ui/Logo';
import { useToast } from '../../components/ui/Toast';
import { LifelineCanvas } from '../lifeline/LifelineCanvas';
import { createSampleArchive } from './sample';

type Step = 'welcome' | 'name' | 'birth' | 'horizon' | 'reveal';
const QUESTION_STEPS: Step[] = ['name', 'birth', 'horizon'];

export function Onboarding() {
  const { today, dispatch } = useStore();
  const toast = useToast();
  const [step, setStep] = useState<Step>('welcome');
  const [form, setForm] = useState<ProfileInput>({ name: '', birthDate: '', horizonYears: 90 });
  const [errors, setErrors] = useState<FieldErrors<keyof ProfileInput>>({});
  const [loadingSample, setLoadingSample] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const next = (field: keyof ProfileInput, to: Step) => {
    const r = validateProfile(form, today);
    // Validate only the fields answered so far.
    const answered: (keyof ProfileInput)[] = field === 'name' ? ['name'] : field === 'birthDate' ? ['name', 'birthDate'] : ['name', 'birthDate', 'horizonYears'];
    const relevant = r.ok ? {} : Object.fromEntries(Object.entries(r.errors).filter(([k]) => answered.includes(k as keyof ProfileInput)));
    if (Object.keys(relevant).length) {
      setErrors(relevant);
      return;
    }
    setErrors({});
    if (to === 'reveal' && r.ok) setProfile({ ...r.value, createdAt: new Date().toISOString() });
    setStep(to);
  };

  const exploreSample = async () => {
    setLoadingSample(true);
    try {
      dispatch({ type: 'archive/replace', data: await createSampleArchive(today) });
      toast({ message: 'Welcome to Mira’s lifeline. Erase it from Settings whenever you’re ready to begin your own.' });
    } catch {
      setLoadingSample(false);
      toast({ message: 'Couldn’t prepare the sample. Try again in a current browser.', tone: 'error' });
    }
  };

  const qIndex = QUESTION_STEPS.indexOf(step);

  return (
    <main className={`onboarding onboarding--${step}`} id="main">
      <header className="onboarding__top">
        <Wordmark height={14} />
        {qIndex >= 0 && (
          <p className="eyebrow mono" aria-live="polite">
            {String(qIndex + 1).padStart(2, '0')} / {String(QUESTION_STEPS.length).padStart(2, '0')}
          </p>
        )}
      </header>

      {step === 'welcome' && (
        <section className="welcome">
          <div className="welcome__text">
            <p className="eyebrow rise">A quiet place to keep what matters</p>
            <h1 className="display welcome__title rise" style={{ ['--i' as string]: 1 }}>
              Your life,<br /><em>in weeks.</em>
            </h1>
            <p className="welcome__lede muted rise" style={{ ['--i' as string]: 2 }}>
              A long life is about four thousand weeks. Most of them slip past without a trace. ETERNALL lays every one of yours out on a single page, so you can
              inscribe the weeks worth keeping, name the chapters, and seal letters for the weeks still ahead.
            </p>
            <div className="welcome__actions rise" style={{ ['--i' as string]: 3 }}>
              <Button variant="primary" iconAfter="arrow" onClick={() => setStep('name')} autoFocus>Begin your lifeline</Button>
              <Button variant="ghost" busy={loadingSample} onClick={() => void exploreSample()}>Explore a sample life</Button>
            </div>
            <p className="welcome__privacy faint rise" style={{ ['--i' as string]: 4 }}>
              Private by design — everything stays on this device.
            </p>
          </div>
          <WelcomeArt />
        </section>
      )}

      {step === 'name' && (
        <Question
          key="name"
          label="First — what should we call you?"
          onBack={() => setStep('welcome')}
          onNext={() => next('name', 'birth')}
          error={errors.name}
        >
          {(id, describedBy) => (
            <input
              id={id}
              className="question__input display"
              value={form.name}
              maxLength={LIMITS.name}
              autoComplete="given-name"
              placeholder="Your name"
              aria-describedby={describedBy}
              aria-invalid={Boolean(errors.name) || undefined}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
        </Question>
      )}

      {step === 'birth' && (
        <Question
          key="birth"
          label={`When were you born, ${form.name.trim()}?`}
          hint="Your lifeline begins on this day. Each row is one year of your life, birthday to birthday."
          onBack={() => setStep('name')}
          onNext={() => next('birthDate', 'horizon')}
          error={errors.birthDate}
        >
          {(id, describedBy) => (
            <input
              id={id}
              type="date"
              className="question__input question__input--date mono"
              value={form.birthDate}
              max={today}
              aria-describedby={describedBy}
              aria-invalid={Boolean(errors.birthDate) || undefined}
              autoFocus
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          )}
        </Question>
      )}

      {step === 'horizon' && (
        <Question
          key="horizon"
          label="How far should your lifeline reach?"
          hint="Not a prediction — a horizon. Ninety years is a generous, common choice. You can change it later."
          onBack={() => setStep('birth')}
          onNext={() => next('horizonYears', 'reveal')}
          nextLabel="Draw my lifeline"
          error={errors.horizonYears}
        >
          {(id, describedBy) => (
            <div className="horizon">
              <output htmlFor={id} className="display horizon__value tabular">
                {form.horizonYears}
                <span> years · {formatNumber(form.horizonYears * 52)} weeks</span>
              </output>
              <input
                id={id}
                type="range"
                className="horizon__range"
                min={LIMITS.minHorizon}
                max={LIMITS.maxHorizon}
                step={1}
                value={form.horizonYears}
                aria-describedby={describedBy}
                aria-valuetext={`${form.horizonYears} years`}
                autoFocus
                onChange={(e) => setForm({ ...form, horizonYears: Number(e.target.value) })}
                style={{ ['--p' as string]: (form.horizonYears - LIMITS.minHorizon) / (LIMITS.maxHorizon - LIMITS.minHorizon) }}
              />
              <div className="horizon__scale mono faint" aria-hidden="true">
                <span>{LIMITS.minHorizon}</span><span>{LIMITS.maxHorizon}</span>
              </div>
            </div>
          )}
        </Question>
      )}

      {step === 'reveal' && profile && <Reveal profile={profile} onEnter={() => dispatch({ type: 'profile/set', profile })} />}
    </main>
  );
}

function Question({
  label,
  hint,
  error,
  onBack,
  onNext,
  nextLabel = 'Continue',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = 'onboarding-q';
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <form
      className="question"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <label htmlFor={id} className="display question__label rise">{label}</label>
      <div className="question__field rise" style={{ ['--i' as string]: 1 }}>{children(id, describedBy)}</div>
      {error ? (
        <p id={`${id}-err`} className="field__error question__msg" role="alert">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="faint question__msg rise" style={{ ['--i' as string]: 2 }}>{hint}</p>
      )}
      <div className="question__actions rise" style={{ ['--i' as string]: 3 }}>
        <Button variant="quiet" icon="left" onClick={onBack}>Back</Button>
        <Button variant="primary" type="submit" iconAfter="arrow">{nextLabel}</Button>
      </div>
    </form>
  );
}

function Reveal({ profile, onEnter }: { profile: Profile; onEnter: () => void }) {
  const { today } = useStore();
  const model = useMemo(() => buildLifeline({ ...EMPTY_DATA, profile }, today)!, [profile, today]);
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);
  const here = locate(profile.birthDate, today) ?? { age: 0, week: 0 };

  useEffect(() => {
    if (progress >= 1) return;
    const duration = 2600;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const x = Math.min(1, (t - start) / duration);
      setProgress(1 - Math.pow(1 - x, 3));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = progress >= 1;
  return (
    <section className="reveal" aria-live="polite">
      <div className="reveal__text">
        <p className="eyebrow">This is your life in weeks</p>
        <p className="display reveal__count tabular" aria-hidden={!done}>
          {formatNumber(Math.floor(model.now * progress))}
        </p>
        <p className={`reveal__caption ${done ? 'is-on' : ''}`}>
          weeks lived, {profile.name}. You’re in week {here.week + 1} of your {ordinal(here.age + 1)} year, and{' '}
          <strong>{formatNumber(model.total - model.now)}</strong> squares are still empty. Each one is a week you haven’t lived yet.
        </p>
        <div className={`reveal__cta ${done ? 'is-on' : ''}`}>
          <Button variant="seal" iconAfter="arrow" onClick={onEnter} disabled={!done} autoFocus={done}>Enter ETERNALL</Button>
        </div>
      </div>
      <div className="reveal__grid">
        <LifelineCanvas model={model} profile={profile} lens="plain" selected={null} reveal={progress} interactive={false} label={`Your lifeline: ${model.now} of ${model.total} weeks lived.`} />
      </div>
    </section>
  );
}

/** Decorative: a fragment of a lifeline whose squares fill in, one week at a time. */
function WelcomeArt() {
  const cols = 13;
  const rows = 9;
  const filled = 61;
  return (
    <div className="welcome-art" aria-hidden="true">
      <div className="welcome-art__grid" style={{ ['--cols' as string]: cols }}>
        {Array.from({ length: cols * rows }, (_, i) => (
          <span
            key={i}
            className={`welcome-art__cell ${i < filled ? 'is-lived' : ''} ${i === filled ? 'is-now' : ''} ${[7, 19, 33, 46, 52].includes(i) ? 'is-memory' : ''} ${i === 88 ? 'is-capsule' : ''}`}
            style={{ ['--d' as string]: `${i * 14}ms` }}
          />
        ))}
      </div>
      <p className="welcome-art__caption mono">one row = one year · one square = one week</p>
    </div>
  );
}
