import './letters.css';
import { formatCountdown, formatMedium, plural } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Seal } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { DRAFT_PATH, LETTER_PATH, letterStatus, sealProgress, sortLetters, type Letter, type LetterDraft } from './letters';
import { Composer } from './LetterComposer';
import { Envelope } from './Envelope';
import { Reader } from './LetterReader';

/**
 * AMAZEEN's post room (once the ENVOI imprint; docs/adr/0011): letters to your future self,
 * sealed until their day. Records keep their `envoi/*` paths. `path` is what follows `/letters`.
 */
export default function LettersRoom(props: { path: string; search: URLSearchParams }) {
  return (
    <div className="amz-letters">
      <Room {...props} />
    </div>
  );
}

function Room({ path, search }: { path: string; search: URLSearchParams }) {
  const house = useHouse();
  const { items } = useCollection<Letter>(LETTER_PATH);

  if (path === '/write') {
    return (
      <Composer
        prefill={{
          ...(search.get('title') ? { title: search.get('title')! } : {}),
          ...(search.get('body') ? { body: search.get('body')! } : {}),
          ...(search.get('opensOn') ? { opensOn: search.get('opensOn')! } : {}),
        }}
      />
    );
  }
  const m = /^\/letter\/([A-Za-z0-9_-]+)$/.exec(path);
  if (m) {
    const letter = items.find((l) => l.id === m[1]);
    if (letter) return <Reader key={letter.id} letter={letter} />;
    return <NotFound onBack={() => house.navigate(house.href('/letters'))} />;
  }
  return <Desk />;
}

function Desk() {
  const house = useHouse();
  const { today, profile } = house;
  const { items } = useCollection<Letter>(LETTER_PATH);
  const draft = useCollection<LetterDraft>(DRAFT_PATH).col.get('current');
  const sorted = sortLetters(items, today);
  const ready = sorted.filter((l) => letterStatus(l, today) === 'ready');
  const sealed = sorted.filter((l) => letterStatus(l, today) === 'sealed');
  const opened = sorted.filter((l) => letterStatus(l, today) === 'opened');
  const focal = ready[0];
  const initial = profile?.name ?? 'A';
  const open = (l: Letter) => house.navigate(house.href(`/letters/letter/${l.id}`));
  const write = () => house.navigate(house.href('/letters/write'));
  usePrimaryAction({ label: draft ? 'Continue your letter' : 'Write a letter', run: write });

  return (
    <div className="envoi-desk">
      <header className="envoi-masthead">
        <p className="envoi-masthead__eyebrow">The post room · Letters to your future</p>
        <h1 className="envoi-masthead__title">
          Write to the person <em>you’re becoming.</em>
        </h1>
        {sealed.length > 0 && <p className="envoi-masthead__count">{plural(sealed.length, 'letter')} in the post.</p>}
      </header>

      <div className="envoi-desk__surface">
        <section className="envoi-desk__focal" aria-label={focal ? 'A letter is ready' : 'Your writing paper'}>
          {focal ? (
            <button type="button" className="envoi-focal is-ready" onClick={() => open(focal)}>
              <span className="envoi-focal__eyebrow">{ready.length === 1 ? 'A letter is ready' : `${ready.length} letters are ready`}</span>
              <span className="envoi-focal__title">“{focal.title}”</span>
              <span className="envoi-focal__meta">Sealed {formatMedium(focal.sealedOn)} · it has been waiting for you</span>
              <span className="envoi-focal__seal">
                <Seal fingerprint={focal.fingerprint} initial={initial} size={86} />
              </span>
              <span className="envoi-focal__cta">Break the seal →</span>
            </button>
          ) : (
            <button type="button" className="envoi-focal is-blank" onClick={write}>
              <span className="envoi-focal__eyebrow">{draft ? 'Your unfinished letter' : 'A blank sheet'}</span>
              <span className="envoi-focal__title">{draft ? `“${draft.title || 'Untitled'}”` : `Dear ${profile?.name ?? 'future me'},`}</span>
              <span className="envoi-focal__lines" aria-hidden="true" />
              <span className="envoi-focal__cta">{draft ? 'Continue writing →' : 'Write a letter →'}</span>
            </button>
          )}
        </section>

        <section className="envoi-desk__rack" aria-labelledby="envoi-rack">
          <h2 id="envoi-rack" className="envoi-rack__title">
            In the post
          </h2>
          {sealed.length === 0 ? (
            <p className="envoi-rack__empty">Letters you seal wait here, each in its own pigeonhole, until their day.</p>
          ) : (
            <ul className="envoi-rack__slots">
              {sealed.map((l) => (
                <li key={l.id}>
                  <button type="button" className="envoi-slot" onClick={() => open(l)} aria-label={`${l.title}, opens ${formatCountdown(today, l.opensOn)}`}>
                    <Envelope title={l.title} to={profile?.name ?? 'me'} opensOn={l.opensOn} sealedOn={l.sealedOn} fingerprint={l.fingerprint} initial={initial} progress={sealProgress(l, today)} size="s" state="sealed" />
                    <span className="envoi-slot__when">Opens {formatCountdown(today, l.opensOn)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="envoi-desk__opened" aria-labelledby="envoi-opened">
          <h2 id="envoi-opened" className="envoi-rack__title">
            Opened · {plural(opened.length, 'letter')} that found you
          </h2>
          {opened.length === 0 ? (
            <p className="envoi-rack__empty">When a letter’s day comes, you’ll break its seal here.</p>
          ) : (
            <ul className="envoi-stack">
              {opened.slice(0, 6).map((l, i) => (
                <li key={l.id} style={{ ['--i' as string]: i }}>
                  <button type="button" className="envoi-paper" onClick={() => open(l)}>
                    <span className="envoi-paper__date">{formatMedium(l.sealedOn)}</span>
                    <span className="envoi-paper__title">{l.title}</span>
                    <span className="envoi-paper__excerpt">{l.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function NotFound({ onBack }: { onBack(): void }) {
  return (
    <div className="envoi-desk">
      <p className="envoi-rack__empty">That letter isn’t on this desk. It may have been destroyed or never sealed here.</p>
      <Button variant="primary" onClick={onBack}>
        Back to the desk
      </Button>
    </div>
  );
}
