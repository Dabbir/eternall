import './people.css';
import { useMemo, useState } from 'react';
import { diffDays, formatLong, formatMedium } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, Icon, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { useStore } from '../../state/store';
import type { Entry } from '../../domain/types';
import { CLOSENESS_LABEL, DEFAULT_PREF, PERSON_PATH, PHOTO_PATH, PREF_PATH, REMIND, REMIND_LABEL, SEEN_PATH, appearsIn, drawers, lastSeen, nextOccurrence, seenId, sinceLabel, upcomingDates, type KindredPref, type Person, type Photo, type Remind, type Seen } from './people';
import { PersonEditor } from './PersonEditor';
import { Pinned } from './Ceremony';

/** The words of a piece, for finding who appears in it. */
export const entryText = (e: Entry): string => (e.kind === 'list' ? `${e.title} ${e.items.join(' ')}` : e.kind === 'story' ? `${e.title} ${e.body}` : e.kind === 'quote' ? `${e.body} ${e.attribution}` : e.body);
const entryTitle = (e: Entry): string => (e.kind === 'story' || e.kind === 'list' ? e.title : e.kind === 'quote' ? `“${e.body.slice(0, 70)}”` : e.body.slice(0, 70));

/** The pin colour of a group, from AMAZEEN's riso inks: the same group always gets the same pin. */
const PINS = ['var(--riso-blue)', 'var(--riso-teal)', 'var(--riso-violet)', 'var(--riso-orange)', 'var(--riso-green)', 'var(--riso-pink)'];
export const pinFor = (label: string) => PINS[[...label].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PINS.length]!;

/**
 * AMAZEEN · People (once KINDRED; docs/adr/0014, docs/design/amazeen.md §14): the newsroom's wall of
 * sources. Cards are pinned on cork in groups; a card opens to the days you saw them, their dates, and
 * the pieces they appear in. `path` is what follows `/people`. Records keep their `kindred/*` paths.
 */
export default function PeopleRoom({ path, search }: { path: string; search: URLSearchParams }) {
  const house = useHouse();
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const [editing, setEditing] = useState<null | { existing?: Person }>(search.get('new') ? {} : null);
  const id = /^\/([A-Za-z0-9_-]+)$/.exec(path)?.[1];
  const open = id ? people.find((p) => p.id === id) : undefined;
  const groups = [...new Set(people.map((p) => p.drawer).filter(Boolean))].sort();
  return (
    <div className="amz-people">
      {open ? (
        <PersonPage person={open} onEdit={() => setEditing({ existing: open })} />
      ) : id ? (
        <p className="pp-missing">
          That card isn’t on the wall.{' '}
          <button type="button" className="pp-link" onClick={() => house.navigate(house.href('/people'))}>
            Back to People
          </button>
        </p>
      ) : (
        <Wall onNew={() => setEditing({})} />
      )}
      {editing && <PersonEditor key={editing.existing?.id ?? 'new'} existing={editing.existing} groups={groups} onClose={() => setEditing(null)} />}
    </div>
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
    house.ceremony(<Pinned name={p.name} line={`Seen today · ${formatMedium(house.today)}`} />, 900);
  };
  return { seen: items, col, sawToday };
}

function Wall({ onNew }: { onNew(): void }) {
  const house = useHouse();
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const { seen } = useSeen();
  const upcoming = upcomingDates(people, house.today, 30);
  const groups = drawers(people, seen, house.today);
  return (
    <div className="pp-room">
      <header className="pp-head">
        <p className="pp-eyebrow">The newsroom wall</p>
        <h1 className="pp-title">
          The <em>People</em>
        </h1>
        <p className="pp-count">
          {people.length ? `${people.length} ${people.length === 1 ? 'card' : 'cards'} pinned · ` : ''}people you add never receive anything and are never contacted.
        </p>
        <div className="pp-head__actions">
          <Button variant="primary" icon="plus" onClick={onNew}>
            Pin a person
          </Button>
          {people.some((p) => p.dates.length > 0) && <RemindControl />}
        </div>
      </header>

      {upcoming.length > 0 && (
        <ul className="pp-dates" aria-label="Dates coming up">
          {upcoming.slice(0, 4).map((u) => (
            <li key={`${u.person.id}-${u.label}`}>
              <button type="button" onClick={() => house.navigate(house.href(`/people/${u.person.id}`))}>
                <strong>{u.person.name}</strong> · {u.label.toLowerCase()}
                {u.turns ? ` (${u.turns})` : ''} · {u.days === 0 ? 'today' : u.days === 1 ? 'tomorrow' : `in ${u.days} days`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {people.length === 0 ? (
        <div className="pp-empty">
          <div className="pp-card pp-card--blank" aria-hidden="true" />
          <p>Pin the people you write about: their birthdays, the days you saw them, and every piece they appear in.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="pp-strip" aria-label={`${g.label}, ${g.people.length} ${g.people.length === 1 ? 'card' : 'cards'}`}>
            <h2 className="pp-tape" style={{ ['--pin' as string]: pinFor(g.label) }}>
              {g.label}
            </h2>
            <ul className="pp-cork">
              {g.people.map((p, i) => (
                <li key={p.id} style={{ ['--tilt' as string]: `${((i * 37) % 7) - 3}deg` }}>
                  <PinnedCard person={p} pin={pinFor(p.drawer || g.label)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/** One card on the wall: photo, name, closeness, time since, the next date within two weeks. */
export function PinnedCard({ person: p, pin, small = false }: { person: Person; pin: string; small?: boolean }) {
  const house = useHouse();
  const { items: seen } = useCollection<Seen>(SEEN_PATH);
  const { col: photos } = useCollection<Photo>(PHOTO_PATH);
  const last = lastSeen(seen, p.id);
  const days = last ? diffDays(last, house.today) : null;
  const next = p.dates.map((d) => ({ d, n: nextOccurrence(d, house.today) })).find((x) => x.n && diffDays(house.today, x.n) <= 14);
  const photo = photos.get(p.id)?.src;
  return (
    <button type="button" className={`pp-card ${small ? 'pp-card--small' : ''} ${days !== null && days > 180 ? 'is-faded' : ''}`} style={{ ['--pin' as string]: pin }} onClick={() => house.navigate(house.href(`/people/${p.id}`))}>
      <span className="pp-pin" aria-hidden="true" />
      {photo && <img className="pp-photo" src={photo} alt="" />}
      <span className="pp-card__closeness">{CLOSENESS_LABEL[p.closeness]}</span>
      <span className="pp-card__name">{p.name}</span>
      <span className="pp-card__since">{sinceLabel(days)}</span>
      {next && (
        <span className="pp-card__date">
          {next.d.label.toLowerCase()} {diffDays(house.today, next.n!) === 0 ? 'today' : `in ${diffDays(house.today, next.n!)} days`}
        </span>
      )}
    </button>
  );
}

function PersonPage({ person, onEdit }: { person: Person; onEdit(): void }) {
  const house = useHouse();
  const { data } = useStore();
  const { seen, col, sawToday } = useSeen();
  const { col: photos } = useCollection<Photo>(PHOTO_PATH);
  const photo = photos.get(person.id)?.src;
  const [note, setNote] = useState('');
  const mine = seen.filter((s) => s.personId === person.id).sort((a, b) => b.date.localeCompare(a.date));
  const days = mine[0] ? diffDays(mine[0].date, house.today) : null;
  const pieces = useMemo(() => appearsIn(person, data.entries, entryText), [person, data.entries]);
  const first = person.name.split(' ')[0]!;

  return (
    <article className="pp-person">
      <button type="button" className="pp-back" onClick={() => house.navigate(house.href('/people'))}>
        <Icon name="left" size={16} /> Back to People
      </button>
      <div className="pp-person__grid">
        <div className="pp-card pp-card--big" style={{ ['--pin' as string]: pinFor(person.drawer || 'Unfiled') }}>
          <span className="pp-pin" aria-hidden="true" />
          {photo && <img className="pp-photo" src={photo} alt={`Photo of ${person.name}`} />}
          <span className="pp-card__closeness">
            {person.drawer || 'Unfiled'} · {CLOSENESS_LABEL[person.closeness]}
          </span>
          <h1 className="pp-card__name">{person.name}</h1>
          <span className="pp-card__since">{sinceLabel(days)}</span>
          {person.howWeMet && <span className="pp-card__met">{person.howWeMet}</span>}
        </div>

        <div className="pp-person__side">
          <div className="pp-saw">
            <TextField label="A line about it (optional)" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
            <Button
              variant="primary"
              onClick={() => {
                sawToday(person, note.trim());
                setNote('');
              }}
            >
              I saw them today
            </Button>
          </div>
          <section aria-labelledby="pp-dates-title">
            <h2 id="pp-dates-title" className="pp-rule">
              Dates
            </h2>
            {person.dates.length ? (
              <ul className="pp-datelist">
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
              <p className="pp-none">No dates yet. Add a birthday from “Edit card”.</p>
            )}
          </section>
          <Button variant="quiet" icon="pen" onClick={onEdit}>
            Edit card
          </Button>
        </div>
      </div>

      <section className="pp-appears" aria-labelledby="pp-appears-title">
        <h2 id="pp-appears-title" className="pp-rule">
          Appears in {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
        </h2>
        {pieces.length === 0 ? (
          <p className="pp-none">Write about {first} — type “@{first}” in a piece — and it is listed here.</p>
        ) : (
          <ol className="pp-list">
            {pieces.slice(0, 30).map((e) => (
              <li key={e.id}>
                <span className="pp-list__date">{formatMedium(e.createdAt.slice(0, 10))}</span>
                <button type="button" className="pp-link" onClick={() => house.navigate(house.href(`/edit/${encodeURIComponent(e.id)}`))}>
                  {entryTitle(e)}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="pp-appears" aria-labelledby="pp-seen-title">
        <h2 id="pp-seen-title" className="pp-rule">
          Days together
        </h2>
        {mine.length === 0 ? (
          <p className="pp-none">When you note that you saw {first}, the day is kept here.</p>
        ) : (
          <ol className="pp-list">
            {mine.map((s) => (
              <li key={s.id}>
                <span className="pp-list__date">{formatMedium(s.date)}</span>
                <span>{s.note || 'Saw them'}</span>
                <button
                  type="button"
                  className="pp-x"
                  aria-label={`Remove the note from ${formatMedium(s.date)}`}
                  onClick={() => {
                    col.remove(s.id);
                    house.toast({ message: 'Removed.', action: { label: 'Undo', run: () => col.put(s) } });
                  }}
                >
                  ×
                </button>
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
      <button
        type="button"
        className="pp-link"
        onClick={() => {
          setChoice(pref.remind);
          setOpen(true);
        }}
      >
        Reminders for dates · {pref.remind === 'off' ? 'off' : REMIND_LABEL[pref.remind].toLowerCase()}
      </button>
      {open && (
        <Dialog
          open
          onClose={() => setOpen(false)}
          eyebrow="People · Reminders"
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
          <fieldset className="pp-choices">
            <legend>When</legend>
            {REMIND.map((r) => (
              <label key={r} className="pp-choice">
                <input type="radio" name="remind" checked={choice === r} onChange={() => setChoice(r)} />
                <span>{REMIND_LABEL[r]}</span>
              </label>
            ))}
          </fieldset>
          <p className="pp-none">Worked out on this device and shown while ETERNALL is open. Nothing is sent to anyone.</p>
        </Dialog>
      )}
    </>
  );
}

/** Above the Shelf: a short strip of the wall — dates coming up, then whoever you saw lately. */
export function PeopleStrip() {
  const house = useHouse();
  const { items: people } = useCollection<Person>(PERSON_PATH);
  const { items: seen } = useCollection<Seen>(SEEN_PATH);
  const soon = upcomingDates(people, house.today, 30).map((u) => u.person);
  const recent = [...people].sort((a, b) => (lastSeen(seen, b.id) ?? '').localeCompare(lastSeen(seen, a.id) ?? ''));
  const shown = [...new Map([...soon, ...recent].map((p) => [p.id, p])).values()].slice(0, 6);
  return (
    <section className="amz-people pp-shelfwall" aria-labelledby="pp-wall-title">
      <div className="pp-shelfwall__head">
        <h2 id="pp-wall-title" className="pp-eyebrow">
          On the wall
        </h2>
        <button type="button" className="pp-link" onClick={() => house.navigate(house.href(shown.length ? '/people' : '/people?new=1'))}>
          {shown.length ? `All people (${people.length}) →` : 'Pin the people you write about →'}
        </button>
      </div>
      {shown.length > 0 && (
        <ul className="pp-cork pp-cork--strip">
          {shown.map((p, i) => (
            <li key={p.id} style={{ ['--tilt' as string]: `${((i * 37) % 7) - 3}deg` }}>
              <PinnedCard person={p} pin={pinFor(p.drawer || 'Unfiled')} small />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
