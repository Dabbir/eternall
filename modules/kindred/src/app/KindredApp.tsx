import '@fontsource/young-serif/latin-400.css';
import '@fontsource/work-sans/latin-400.css';
import '@fontsource/work-sans/latin-400-italic.css';
import '@fontsource/work-sans/latin-600.css';
import '../theme/kindred.css';
import '../theme/kindred.kit.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { diffDays, formatLong, formatMedium, type ImprintAppProps } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Button, Dialog, Icon, Segmented, TextField } from '@eternall/ui';
import { DimensionToggle, Stage3D, themeColors } from '@eternall/stage';
import { useCollection } from '@eternall/vault';
import { CLOSENESS_LABEL, DEFAULT_PREF, PERSON_PATH, PHOTO_PATH, PREF_PATH, REMIND, REMIND_LABEL, SEEN_PATH, constellation, drawers, lastSeen, nextOccurrence, seenId, sinceLabel, upcomingDates, type KindredPref, type Person, type Photo, type Remind, type Seen, type Star } from '../people';
import { PersonEditor } from './PersonEditor';
import { Chrome } from './Chrome';
import type { SkyProps } from './constellationScene';

type View = 'file' | 'sky';

export default function KindredApp({ path, search }: ImprintAppProps) {
  const house = useHouse();
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const [editing, setEditing] = useState<null | { existing?: Person }>(search.get('new') ? {} : null);
  const m = /^\/person\/([A-Za-z0-9_-]+)$/.exec(path);
  const open = m ? people.find((p) => p.id === m[1]) : undefined;
  const view: View = path === '/sky' ? 'sky' : 'file';
  usePrimaryAction({ label: 'Add a person', run: () => setEditing({}) });
  return (
    <Chrome here={m ? 'person' : view}>
      <div className="kd">
        {open ? <PersonPage person={open} onEdit={() => setEditing({ existing: open })} /> : m ? <p className="kd-missing">That card isn’t in the file. <button type="button" className="kd-link" onClick={() => house.navigate(house.href('/'))}>Back to the card file</button></p> : <Home view={view} onNew={() => setEditing({})} />}
        {editing && <PersonEditor key={editing.existing?.id ?? 'new'} existing={editing.existing} drawers={[...new Set(people.map((p) => p.drawer).filter(Boolean))].sort()} onClose={() => setEditing(null)} />}
      </div>
    </Chrome>
  );
}

function useSeen() {
  const house = useHouse();
  const { items, col } = useCollection<Seen>(SEEN_PATH);
  const sawToday = (p: Person, note = '') => {
    const id = seenId(p.id, house.today);
    const prev = col.get(id);
    col.put({ id, personId: p.id, date: house.today, note: note || prev?.note || '' });
    house.toast({ message: `Noted: you saw ${p.name} today.`, tone: 'accent', ...(prev ? {} : { action: { label: 'Undo', run: () => col.remove(id) } }) });
  };
  return { seen: items, col, sawToday };
}

function Home({ view, onNew }: { view: View; onNew(): void }) {
  const house = useHouse();
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const { seen } = useSeen();
  const upcoming = upcomingDates(people, house.today, 30);
  const open = (id: string) => house.navigate(house.href(`/person/${id}`));
  const hasDates = people.some((p) => p.dates.length > 0);

  return (
    <>
      <header className="kd-head">
        <h1 className="kd-title">Keep the people close.</h1>
        {people.length > 0 && (
          <p className="kd-count">
            {people.length} {people.length === 1 ? 'card' : 'cards'} in the file
            {view === 'sky' ? ' · nearer the centre means seen more recently' : ''}
          </p>
        )}
      </header>
      {upcoming.length > 0 && (
        <ul className="kd-dates" aria-label="Dates coming up">
          {upcoming.slice(0, 4).map((u) => (
            <li key={`${u.person.id}-${u.label}`}>
              <button type="button" onClick={() => open(u.person.id)}>
                <span className="kd-dates__mark" aria-hidden="true">⟡</span>
                <span>
                  <strong>{u.person.name}</strong> · {u.label.toLowerCase()}
                  {u.turns ? ` (${u.turns})` : ''} · {u.days === 0 ? 'today' : u.days === 1 ? 'tomorrow' : `in ${u.days} days`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasDates && <RemindControl />}
      {people.length === 0 ? (
        <div className="kd-empty">
          <div className="kd-card kd-card--blank" aria-hidden="true">
            <span className="kd-card__name">&nbsp;</span>
          </div>
          <p className="kd-empty__text">Who do you want to keep close? Add one person to begin.</p>
          <p className="kd-empty__note">People you add never receive anything and are never contacted.</p>
          <Button variant="primary" icon="plus" onClick={onNew}>
            Add a person
          </Button>
        </div>
      ) : view === 'file' ? (
        <CardFile people={people} seen={seen} onOpen={open} />
      ) : (
        <Sky people={people} seen={seen} onOpen={open} />
      )}
    </>
  );
}

function CardFile({ people, seen, onOpen }: { people: readonly Person[]; seen: readonly Seen[]; onOpen(id: string): void }) {
  const { today } = useHouse();
  const groups = drawers(people, seen, today);
  const { col: photos } = useCollection<Photo>(PHOTO_PATH);
  return (
    <div className="kd-file">
      {groups.map((g) => (
        <section key={g.label} className="kd-drawer" aria-label={`${g.label}, ${g.people.length} ${g.people.length === 1 ? 'card' : 'cards'}`}>
          <h2 className="kd-rail">
            <span>{g.label}</span>
          </h2>
          <ul className="kd-row" style={{ ['--n' as string]: g.people.length }}>
            {g.people.map((p, i) => {
              const last = lastSeen(seen, p.id);
              const days = last ? diffDays(last, today) : null;
              const next = p.dates.map((d) => ({ d, n: nextOccurrence(d, today) })).filter((x) => x.n && diffDays(today, x.n) <= 14)[0];
              return (
                <li key={p.id} style={{ ['--i' as string]: i }}>
                  <button type="button" className={`kd-card ${days !== null && days > 180 ? 'is-faded' : ''}`} onClick={() => onOpen(p.id)}>
                    {photos.get(p.id) && <img className="kd-photo kd-photo--thumb" src={photos.get(p.id)!.src} alt="" />}
                    <span className="kd-card__drawer">{CLOSENESS_LABEL[p.closeness]}</span>
                    <span className="kd-card__name">{p.name}</span>
                    <span className="kd-card__since">{days !== null && days > 60 ? `last seen ${formatMedium(last!).replace(/^\d+ /u, '')}` : sinceLabel(days)}</span>
                    {next && (
                      <span className="kd-card__date">
                        ⟡ {next.d.label.toLowerCase()} {diffDays(today, next.n!) === 0 ? 'today' : `in ${diffDays(today, next.n!)} days`}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Sky({ people, seen, onOpen }: { people: readonly Person[]; seen: readonly Seen[]; onOpen(id: string): void }) {
  const house = useHouse();
  const stars = useMemo(() => constellation(people, seen, house.today), [people, seen, house.today]);
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');
  const view = house.immersive.allowed ? dimension : '2d';
  const [sort, setSort] = useState<'seen' | 'close'>('seen');
  const nearest = new Set([...stars].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).slice(0, 12).map((s) => s.id));
  const list = [...stars].sort((a, b) => (sort === 'seen' ? (b.days ?? 1e9) - (a.days ?? 1e9) : b.size - a.size || a.name.localeCompare(b.name)));
  return (
    <div className="kd-sky">
      <div className="kd-sky__tools">
        <DimensionToggle value={view} onChange={setDimension} allowed={house.immersive.allowed} reason={house.immersive.reason} label3d="In the round" />
      </div>
      {view === '3d' ? (
        <Sky3D stars={stars} onOpen={onOpen} onDowngrade={() => setDimension('2d')} />
      ) : (
        <svg className="kd-sky__svg" viewBox="-1.15 -1.15 2.3 2.3" role="img" aria-label="Your people as a star chart: nearer the centre means seen more recently. The list below has the same information.">
          {[0.35, 0.6, 0.85].map((r) => (
            <circle key={r} r={r} className="kd-sky__orbit" />
          ))}
          <circle r="0.045" className="kd-sky__you" />
          <text y="0.12" className="kd-sky__label kd-sky__label--you">you</text>
          {stars.map((s, i) => (
            <a key={s.id} href={house.href(`/person/${s.id}`)} onClick={(e) => { e.preventDefault(); onOpen(s.id); }} className="kd-sky__star" style={{ ['--d' as string]: `${i * 40}ms` }} aria-label={`${s.name}, ${sinceLabel(s.days)}`}>
              <circle cx={s.x} cy={s.y} r={0.012 + s.size * 0.011} className="kd-sky__halo" />
              <circle cx={s.x} cy={s.y} r={0.008 + s.size * 0.006} className="kd-sky__dot" />
              <text x={s.x} y={s.y + 0.06 + s.size * 0.008} className={`kd-sky__label ${nearest.has(s.id) ? '' : 'is-far'}`}>
                {s.name}
              </text>
            </a>
          ))}
        </svg>
      )}
      <section className="kd-sky__list" aria-labelledby="kd-list-title">
        <div className="kd-sky__listhead">
          <h2 id="kd-list-title" className="kd-rail">
            <span>Everyone</span>
          </h2>
          <Segmented label="Sort" options={[{ value: 'seen', label: 'Longest unseen' }, { value: 'close', label: 'By closeness' }] as const} value={sort} onChange={(v) => setSort(v as 'seen' | 'close')} />
        </div>
        <ol>
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onOpen(s.id)}>
                <span className="kd-sky__name">{s.name}</span>
                <span className="kd-sky__meta">{sinceLabel(s.days)} · {s.drawer}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const loadSky = () => import('./constellationScene');

function Sky3D({ stars, onOpen, onDowngrade }: { stars: Star[]; onOpen(id: string): void; onDowngrade(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<Pick<SkyProps, 'star' | 'you' | 'line' | 'ink'> | null>(null);
  useEffect(() => {
    if (ref.current) {
      const c = themeColors(ref.current, ['accent', 'accent-2', 'rule-strong', 'ink']);
      setColors({ star: c.accent, you: c['accent-2'], line: c['rule-strong'], ink: c.ink });
    }
  }, []);
  const props = useMemo<SkyProps | null>(() => (colors ? { stars, ...colors, onOpen } : null), [colors, stars, onOpen]);
  return (
    <div ref={ref} className="kd-sky3d">
      {props && <Stage3D load={loadSky} props={props} label="Your people as stars around you; nearer means seen more recently." onDowngrade={onDowngrade} className="kd-sky3d__stage" />}
      <p className="kd-sky3d__hint" aria-hidden="true">Drag to turn the sky · Ctrl or ⌘ + scroll to zoom · click a star to open the card</p>
    </div>
  );
}

function PersonPage({ person, onEdit }: { person: Person; onEdit(): void }) {
  const house = useHouse();
  const { seen, col, sawToday } = useSeen();
  const [flipped, setFlipped] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { col: photos } = useCollection<Photo>(PHOTO_PATH);
  const photo = photos.get(person.id)?.src;
  const [note, setNote] = useState('');
  const mine = seen.filter((s) => s.personId === person.id).sort((a, b) => b.date.localeCompare(a.date));
  const last = mine[0]?.date ?? null;
  const days = last ? diffDays(last, house.today) : null;
  const first = person.name.split(' ')[0]!;
  // Shared timeline, resolved at read time: memories across imprints that name them.
  const mentions = useMemo(() => {
    const re = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'iu');
    return house
      .gather.memories()
      .filter((m) => m.imprint !== 'kindred' && (re.test(m.title) || (m.excerpt && re.test(m.excerpt))))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [house, first]);
  const press = () => {
    sawToday(person, note.trim());
    setNote('');
    setPressed(true);
    window.setTimeout(() => setPressed(false), 450);
  };

  return (
    <article className="kd-person">
      <button type="button" className="kd-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the card file
      </button>
      <div className={`kd-flip ${flipped ? 'is-flipped' : ''}`}>
        <div className={`kd-card kd-card--big kd-flip__front ${pressed ? 'is-pressed' : ''} ${photo ? 'has-photo' : ''}`} aria-hidden={flipped}>
          {photo && <img className="kd-photo kd-photo--print" src={photo} alt={`Photo of ${person.name}`} />}
          <span className="kd-card__drawer">
            {person.drawer || 'Unfiled'} · {CLOSENESS_LABEL[person.closeness]}
          </span>
          <h1 className="kd-card__name">{person.name}</h1>
          <span className="kd-card__since">{sinceLabel(days)}</span>
          {person.howWeMet && <span className="kd-card__met">{person.howWeMet}</span>}
        </div>
        <div className="kd-card kd-card--big kd-card--back kd-flip__back" aria-hidden={!flipped}>
          <h2 className="kd-back__title">Dates</h2>
          {person.dates.length ? (
            <ul className="kd-back__dates">
              {person.dates.map((d) => {
                const next = nextOccurrence(d, house.today);
                return (
                  <li key={d.label + d.date}>
                    <span>{d.label}</span>
                    <em>
                      {formatLong(d.date)}
                      {next && d.yearly ? ` · next ${formatMedium(next)}` : ''}
                    </em>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="kd-back__none">No dates yet. Add a birthday from “Edit card”.</p>
          )}
        </div>
      </div>
      <div className="kd-person__actions">
        <div className="kd-saw">
          <TextField label="A line about it (optional)" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
          <Button variant="primary" onClick={press}>
            I saw them today
          </Button>
        </div>
        <div className="kd-person__more">
          <Button variant="ghost" onClick={() => setFlipped((f) => !f)}>
            {flipped ? 'Show the front' : 'Turn the card over'}
          </Button>
          <Button variant="quiet" icon="pen" onClick={onEdit}>
            Edit card
          </Button>
          {house.profile && last && (
            <Button variant="quiet" icon="grid" onClick={() => house.navigate(`/?week=${Math.max(0, Math.floor(diffDays(house.profile!.birthDate, last) / 7))}`)}>
              Show on lifeline
            </Button>
          )}
        </div>
      </div>
      <section className="kd-timeline" aria-labelledby="kd-tl">
        <h2 id="kd-tl" className="kd-rail">
          <span>Together</span>
        </h2>
        {mine.length === 0 && mentions.length === 0 ? (
          <p className="kd-back__none">When you note that you saw {first}, it appears here, with mentions from your journal and letters.</p>
        ) : (
          <ol className="kd-tl">
            {[...mine.map((s) => ({ key: s.id, date: s.date, text: s.note || 'Saw them', href: null as string | null, seen: s })), ...mentions.map((m) => ({ key: `${m.imprint}-${m.id}`, date: m.date, text: `${m.title}`, href: m.href, seen: null as Seen | null }))]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e) => (
                <li key={e.key}>
                  <span className="kd-tl__date">{formatMedium(e.date)}</span>
                  {e.href ? (
                    <button type="button" className="kd-link" onClick={() => house.navigate(e.href!)}>
                      {e.text}
                    </button>
                  ) : (
                    <span>{e.text}</span>
                  )}
                  {e.seen && (
                    <button
                      type="button"
                      className="kd-tl__x"
                      aria-label={`Remove the note from ${formatMedium(e.date)}`}
                      onClick={() => {
                        const prev = e.seen!;
                        col.remove(prev.id);
                        house.toast({ message: 'Removed.', action: { label: 'Undo', run: () => col.put(prev) } });
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
          </ol>
        )}
      </section>
    </article>
  );
}

/** Opt-in birthday reminders, worked out on this device; the house delivers them. */
function RemindControl() {
  const house = useHouse();
  const { col } = useCollection<KindredPref>(PREF_PATH);
  const pref = col.get('pref') ?? DEFAULT_PREF;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Remind>(pref.remind);
  const save = () => {
    col.put({ ...pref, remind: choice });
    house.toast({ message: choice === 'off' ? 'Reminders are off.' : `Reminders: ${REMIND_LABEL[choice].toLowerCase()}.`, tone: 'accent' });
    setOpen(false);
  };
  return (
    <>
      <p className="kd-remind">
        <button type="button" className="kd-link" onClick={() => { setChoice(pref.remind); setOpen(true); }}>
          Reminders for dates · {pref.remind === 'off' ? 'off' : REMIND_LABEL[pref.remind].toLowerCase()}
        </button>
      </p>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          className="kd-editor"
          eyebrow="KINDRED · Reminders"
          title="Remind me of birthdays and dates"
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save}>
                Save
              </Button>
            </>
          }
        >
          <div className="editor-form">
            <fieldset className="kd-closeness">
              <legend>When</legend>
              {REMIND.map((r) => (
                <label key={r} className="kd-pill">
                  <input type="radio" name="remind" checked={choice === r} onChange={() => setChoice(r)} {...(pref.remind === r ? { 'data-autofocus': true } : {})} />
                  <span>{REMIND_LABEL[r]}</span>
                </label>
              ))}
              <p className="field__hint">{choice === 'off' ? 'Nothing will remind you; dates still show here.' : choice === 'day' ? 'Once, on the day.' : 'Once ahead of time, and again on the day.'}</p>
            </fieldset>
            <p className="muted">
              Reminders are worked out on this device and appear when ETERNALL is open. Nothing is sent to anyone, and no server knows your people.{' '}
              <button type="button" className="kd-link" onClick={() => house.navigate('/settings')}>
                Notifications in Settings
              </button>
            </p>
          </div>
        </Dialog>
      )}
    </>
  );
}
