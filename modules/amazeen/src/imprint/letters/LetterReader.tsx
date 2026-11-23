import { useEffect, useRef, useState } from 'react';
import { diffDays, formatCountdown, formatLong, formatMedium, plural } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Icon, Seal } from '@eternall/ui';
import { Stage3D, themeColors } from '@eternall/stage';
import type { EnvelopeProps } from './envelopeScene';
import { useCollection } from '@eternall/vault';
import { LETTER_PATH, letterStatus, sealProgress, verifySeal, type Letter } from './letters';
import { Envelope } from './Envelope';

type Stage = 'closed' | 'breaking' | 'open';
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function Reader({ letter }: { letter: Letter }) {
  const house = useHouse();
  const { today, profile } = house;
  const { col } = useCollection<Letter>(LETTER_PATH);
  const status = letterStatus(letter, today);
  const [stage, setStage] = useState<Stage>(status === 'opened' ? 'open' : 'closed');
  const [intact, setIntact] = useState<boolean | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const back = () => house.navigate(house.href('/letters'));
  const initial = profile?.name ?? 'A';

  const [flat, setFlat] = useState(false);
  const immersive = house.immersive.allowed && !flat;
  const breakSeal = async () => {
    setStage('breaking');
    const [ok] = await Promise.all([verifySeal(letter).catch(() => false), new Promise((r) => window.setTimeout(r, reduced() ? 50 : immersive ? 1500 : 1000))]);
    setIntact(ok);
    col.put({ ...letter, openedAt: new Date().toISOString() });
    setStage('open');
  };

  const remove = () => {
    col.remove(letter.id);
    house.toast({ message: status === 'sealed' ? 'Letter destroyed, unread.' : 'Letter removed.', action: { label: 'Undo', run: () => col.put(letter) } });
    back();
  };

  usePrimaryAction(status === 'ready' && stage === 'closed' ? { label: 'Break the seal', run: () => void breakSeal() } : { label: 'Write a letter', run: () => house.navigate(house.href('/write')) });

  const removeBar = confirmRemove ? (
    <div className="envoi-confirm" role="alertdialog" aria-label="Confirm">
      <p>{status === 'sealed' ? 'Destroy this letter without ever reading it?' : 'Remove this letter for good?'}</p>
      <Button variant="quiet" onClick={() => setConfirmRemove(false)}>
        Keep it
      </Button>
      <Button variant="danger" onClick={remove}>
        {status === 'sealed' ? 'Destroy' : 'Remove'}
      </Button>
    </div>
  ) : null;

  const waited = diffDays(letter.sealedOn, letter.opensOn);

  return (
    <div className="envoi-reader">
      <button type="button" className="envoi-back" onClick={back}>
        <Icon name="left" size={16} /> Back to the desk
      </button>

      {status === 'sealed' && (
        <section className="envoi-reader__sealed" aria-labelledby="envoi-r-title">
          <h1 id="envoi-r-title" className="visually-hidden">
            {letter.title}
          </h1>
          <Envelope title={letter.title} to={profile?.name ?? 'me'} opensOn={letter.opensOn} sealedOn={letter.sealedOn} fingerprint={letter.fingerprint} initial={initial} progress={sealProgress(letter, today)} size="l" state="sealed" />
          <p className="envoi-reader__countdown">Opens {formatCountdown(today, letter.opensOn)}</p>
          <p className="envoi-reader__meta">
            {formatLong(letter.opensOn)} · sealed {formatMedium(letter.sealedOn)} · {Math.round(sealProgress(letter, today) * 100)}% of the wait behind you
          </p>
          {removeBar ?? (
            <div className="envoi-reader__actions">
              <Button variant="quiet" icon="trash" onClick={() => setConfirmRemove(true)}>
                Destroy unread
              </Button>
              <Button variant="primary" onClick={back}>
                Leave it sealed
              </Button>
            </div>
          )}
        </section>
      )}

      {status !== 'sealed' && stage !== 'open' && (
        <section className="envoi-reader__ready" aria-labelledby="envoi-r-title">
          {immersive ? (
            <Envelope3D fingerprint={letter.fingerprint} initial={initial} breaking={stage === 'breaking'} onDowngrade={() => setFlat(true)} />
          ) : (
            <Seal fingerprint={letter.fingerprint} initial={initial} size={170} broken={stage === 'breaking'} className="envoi-reader__seal" label={stage === 'breaking' ? 'The seal breaks' : 'Wax seal, ready to break'} />
          )}
          <p className="envoi-reader__eyebrow">A letter is ready</p>
          <h1 id="envoi-r-title" className="envoi-reader__title">
            {letter.title}
          </h1>
          <p className="envoi-reader__meta">
            Sealed on {formatLong(letter.sealedOn)}. It has waited {plural(waited, 'day')} for you.
          </p>
          <Button variant="accent" onClick={() => void breakSeal()} busy={stage === 'breaking'}>
            Break the seal
          </Button>
        </section>
      )}

      {stage === 'open' && (
        <article className="envoi-letter" aria-labelledby="envoi-r-title">
          {intact !== null && (
            <p className={`envoi-letter__verdict ${intact ? 'is-ok' : 'is-bad'}`}>
              <Icon name={intact ? 'check' : 'close'} size={14} />
              {intact ? 'Seal intact — exactly as you wrote it.' : 'The seal didn’t match. This letter may have been altered.'}
            </p>
          )}
          <p className="envoi-letter__date">{formatLong(letter.sealedOn)}</p>
          <h1 id="envoi-r-title" className="envoi-letter__title">
            {letter.title}
          </h1>
          <div className="envoi-letter__body">
            {letter.body.split(/\n{2,}/).map((para, i) => (
              <p key={i} style={{ ['--i' as string]: i }}>
                {para}
              </p>
            ))}
          </div>
          <p className="envoi-letter__meta">
            Sealed {formatMedium(letter.sealedOn)} · opened {letter.openedAt ? formatMedium(letter.openedAt.slice(0, 10)) : 'today'} · {plural(waited, 'day')} in the dark
          </p>
          {removeBar ?? (
            <div className="envoi-reader__actions">
              <Button variant="quiet" icon="trash" onClick={() => setConfirmRemove(true)}>
                Remove
              </Button>
              <Button variant="primary" onClick={back}>
                Fold it away
              </Button>
            </div>
          )}
        </article>
      )}
    </div>
  );
}

const loadEnvelope = () => import('./envelopeScene');

/** The physical envelope (immersive mode). Colours come from AMAZEEN's inks. */
function Envelope3D({ fingerprint, initial, breaking, onDowngrade }: { fingerprint: string; initial: string; breaking: boolean; onDowngrade(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [props, setProps] = useState<EnvelopeProps | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = themeColors(ref.current, ['accent', 'accent-deep', 'accent-2', 'ink', 'sheet']);
    setProps({ breaking, wax: c.accent, waxDeep: c['accent-deep'], paper: c.sheet, ink: c.ink, airmailRed: c.accent, airmailBlue: c['accent-2'], fingerprint, initial });
    // Colours are read once; `breaking` flows through the update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const live = props ? { ...props, breaking } : null;
  return (
    <div ref={ref} className="envoi-envelope3d">
      {live && <Stage3D load={loadEnvelope} props={live} label={breaking ? 'The wax seal breaks and the envelope opens.' : 'A sealed envelope with a wax seal.'} onDowngrade={onDowngrade} className="envoi-envelope3d__stage" />}
    </div>
  );
}
