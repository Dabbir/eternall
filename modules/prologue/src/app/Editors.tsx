import { useState } from 'react';
import { createId, formatLong, type FieldErrors } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog, TextArea, TextField } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import {
  ENDINGS,
  HOPE_PATH,
  HOPE_STATES,
  LIMITS,
  SEASON_PATH,
  STATE_HINT,
  STATE_LABEL,
  hopesOf,
  meteorologicalSeason,
  validateHope,
  validateSeason,
  type Hope,
  type HopeInput,
  type HopeState,
  type Season,
  type SeasonInput,
} from '../seasons';

/** A hope: a few words, where it stands, and optional links (REFRAIN ritual, KINDRED people). */
export function HopeEditor({ season, existing, onClose }: { season: Season; existing?: Hope | undefined; onClose(): void }) {
  const house = useHouse();
  const { items, col } = useCollection<Hope>(HOPE_PATH);
  const siblings = hopesOf(items, season.id);
  const rituals = house.capability('rituals.list');
  const people = house.capability('people.mention');
  const initial: HopeInput = existing ? { title: existing.title, state: existing.state, reflection: existing.reflection } : { title: '', state: 'wings', reflection: '' };
  const [form, setForm] = useState(initial);
  const [ritualRef, setRitualRef] = useState<string | null>(existing?.ritualRef ?? null);
  const [peopleRefs, setPeopleRefs] = useState<string[]>(existing?.peopleRefs ?? []);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<FieldErrors<keyof HopeInput>>({});
  const [confirm, setConfirm] = useState<null | 'remove'>(null);
  const set = <K extends keyof HopeInput>(k: K, v: HopeInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const save = () => {
    const r = validateHope(form, siblings.length, !existing);
    if (!r.ok) return setErrors(r.errors);
    const act = existing?.act ?? (siblings.at(-1)?.act ?? 0) + 1;
    col.put({ id: existing?.id ?? createId(), seasonId: season.id, act, ritualRef, peopleRefs, ...r.value });
    house.toast({ message: existing ? 'The script is updated.' : `Act ${act} is written.`, tone: 'accent' });
    onClose();
  };
  const remove = () => {
    if (!existing) return;
    col.remove(existing.id);
    house.toast({ message: 'Hope removed from the script.', action: { label: 'Undo', run: () => col.put(existing) } });
    onClose();
  };
  const matches = people && query.trim() ? people.search(query).filter((p) => !peopleRefs.includes(p.id)).slice(0, 5) : [];

  return (
    <Dialog
      open
      onClose={onClose}
      className="pl-editor"
      eyebrow={`PROLOGUE · ${season.name}`}
      title={existing ? 'Edit this hope' : 'Add a hope'}
      footer={
        confirm ? (
          <div className="confirm-bar">
            <p>Remove this hope? You can also mark it “let go”.</p>
            <Button variant="quiet" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Remove
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
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="pl-hope">
              {existing ? 'Save' : 'Write it in'}
            </Button>
          </>
        )
      }
    >
      <form id="pl-hope" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TextField label="The hope" className="pl-editor__title" placeholder="Finish the blue glaze series" autoFocus value={form.title} maxLength={LIMITS.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
        <fieldset className="pl-states">
          <legend>Where it stands</legend>
          {HOPE_STATES.map((s) => (
            <label key={s} className="pl-chip" title={STATE_HINT[s]}>
              <input type="radio" name="state" checked={form.state === s} onChange={() => set('state', s)} />
              <span>{STATE_LABEL[s]}</span>
            </label>
          ))}
          <p className="field__hint">{STATE_HINT[form.state as HopeState]}</p>
        </fieldset>
        {rituals && rituals.list().length > 0 && (
          <label className="pl-select">
            <span>Linked REFRAIN ritual (optional)</span>
            <select value={ritualRef ?? ''} onChange={(e) => setRitualRef(e.target.value || null)}>
              <option value="">None</option>
              {rituals.list().map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {people && (
          <div className="pl-people">
            <TextField label="Who’s in it (optional)" placeholder="Type a name from KINDRED" value={query} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
            {matches.length > 0 && (
              <ul className="pl-people__matches" aria-label="Matching people">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setPeopleRefs((r) => [...r, p.id]); setQuery(''); }}>
                      + {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {peopleRefs.length > 0 && (
              <ul className="pl-people__chips">
                {peopleRefs.map((id) => (
                  <li key={id}>
                    {people.nameOf(id) ?? 'Someone no longer in KINDRED'}
                    <button type="button" aria-label={`Remove ${people.nameOf(id) ?? 'person'}`} onClick={() => setPeopleRefs((r) => r.filter((x) => x !== id))}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <TextArea label="A line about it (optional)" rows={2} value={form.reflection} maxLength={LIMITS.reflection} showCount error={errors.reflection} onChange={(e) => set('reflection', e.target.value)} />
      </form>
    </Dialog>
  );
}

export function SeasonEditor({ existing, others, onClose }: { existing?: Season | undefined; others: readonly Season[]; onClose(): void }) {
  const house = useHouse();
  const { col } = useCollection<Season>(SEASON_PATH);
  // The next free meteorological season: today's, or the one after the latest season.
  const latest = others.at(-1);
  const from = latest && latest.end >= house.today ? new Date(Date.parse(latest.end) + 86_400_000).toISOString().slice(0, 10) : house.today;
  const guess = meteorologicalSeason(from, house.profile?.hemisphere ?? 'north');
  const initial: SeasonInput = existing ? { name: existing.name, theme: existing.theme, start: existing.start, end: existing.end } : { name: guess.name, theme: '', start: guess.start, end: guess.end };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<keyof SeasonInput>>({});
  const set = <K extends keyof SeasonInput>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, ...(k === 'end' ? { start: undefined } : {}) }));
  };
  const save = () => {
    const r = validateSeason(form, others);
    if (!r.ok) return setErrors(r.errors);
    col.put({ id: existing?.id ?? createId(), closedAt: existing?.closedAt ?? null, epilogue: existing?.epilogue ?? '', ...r.value });
    house.toast({ message: existing ? 'Season updated.' : r.value.start > house.today ? `${r.value.name} is in rehearsal. Write its hopes now; the curtain rises on ${formatLong(r.value.start)}.` : `${r.value.name} begins. Curtain up.`, tone: 'accent' });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      className="pl-editor"
      eyebrow="PROLOGUE · The playbill"
      title={existing ? 'Edit the season' : 'Begin a season'}
      footer={
        <>
          <span className="spacer" />
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="pl-season">
            {existing ? 'Save' : 'Raise the curtain'}
          </Button>
        </>
      }
    >
      <form id="pl-season" className="editor-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <TextField label="Season" value={form.name} maxLength={LIMITS.name} autoFocus error={errors.name} hint="A meteorological season by default. Rename it freely: “the move”, “the first term”." onChange={(e) => set('name', e.target.value)} />
        <TextField label="The season of… (optional)" placeholder="staying close" value={form.theme} maxLength={LIMITS.theme} error={errors.theme} onChange={(e) => set('theme', e.target.value)} />
        <div className="editor-form__row editor-form__row--2">
          <TextField label="Opens" type="date" value={form.start} error={errors.start} onChange={(e) => set('start', e.target.value)} />
          <TextField label="Closes" type="date" value={form.end} min={form.start || undefined} error={errors.end} onChange={(e) => set('end', e.target.value)} />
        </div>
      </form>
    </Dialog>
  );
}

/** Closing a season (docs/design/prologue.md §5.2): one question per act, then the epilogue. */
export function EpilogueView({ season, hopes }: { season: Season; hopes: Hope[] }) {
  const house = useHouse();
  const { col: seasons } = useCollection<Season>(SEASON_PATH);
  const { col: hopeCol } = useCollection<Hope>(HOPE_PATH);
  const [endings, setEndings] = useState<Record<string, { state: HopeState; line: string }>>(() =>
    Object.fromEntries(hopes.map((h) => [h.id, { state: (ENDINGS as readonly string[]).includes(h.state) ? h.state : h.state === 'stage' ? 'bow' : 'letGo', line: h.reflection }])),
  );
  const [epilogue, setEpilogue] = useState(season.epilogue);
  const [lowering, setLowering] = useState(false);
  const letters = house.capability('letters.compose');
  const close = () => {
    for (const h of hopes) {
      const e = endings[h.id]!;
      hopeCol.put({ ...h, state: e.state, reflection: e.line.trim().slice(0, LIMITS.reflection) });
    }
    seasons.put({ ...season, epilogue: epilogue.trim().slice(0, LIMITS.epilogue), closedAt: new Date().toISOString() });
    setLowering(true);
    const done = () => {
      house.navigate(house.href(`/playbill/${season.id}`));
      house.toast({ message: `${season.name} has closed. Its playbill hangs in the lobby.`, tone: 'accent' });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else window.setTimeout(done, 1250);
  };
  return (
    <section className="pl-epilogue" aria-labelledby="pl-epi-title">
      {lowering && (
        <div className="pl-curtain is-lowering" aria-hidden="true">
          <span className="pl-curtain__half pl-curtain__half--l" />
          <span className="pl-curtain__half pl-curtain__half--r" />
        </div>
      )}
      <p className="pl-eyebrow">PROLOGUE · Closing {season.name}</p>
      <h1 id="pl-epi-title" className="pl-display">
        How did it play out?
      </h1>
      <ol className="pl-epilogue__acts">
        {hopes.map((h) => (
          <li key={h.id}>
            <fieldset className="pl-states">
              <legend className="pl-act__title">{h.title}</legend>
              {ENDINGS.map((s) => (
                <label key={s} className="pl-chip" title={STATE_HINT[s]}>
                  <input type="radio" name={`end-${h.id}`} checked={endings[h.id]!.state === s} onChange={() => setEndings((e) => ({ ...e, [h.id]: { ...e[h.id]!, state: s } }))} />
                  <span>{STATE_LABEL[s]}</span>
                </label>
              ))}
            </fieldset>
            <TextField label="A line about it" value={endings[h.id]!.line} maxLength={LIMITS.reflection} onChange={(e) => setEndings((x) => ({ ...x, [h.id]: { ...x[h.id]!, line: e.target.value } }))} />
          </li>
        ))}
      </ol>
      {hopes.length === 0 && <p className="pl-lede">This season had no acts. Write its epilogue anyway, if you like.</p>}
      <TextArea label="Epilogue" placeholder="What happened, what came true, what changed." rows={6} value={epilogue} maxLength={LIMITS.epilogue} showCount onChange={(e) => setEpilogue(e.target.value)} />
      <div className="pl-epilogue__actions">
        <Button variant="quiet" onClick={() => house.navigate(house.href('/'))}>
          Not yet
        </Button>
        {letters && (
          <Button variant="ghost" onClick={() => letters.compose({ title: `At the end of the next season`, body: `Dear me,\n\n${season.name} just closed. ` })}>
            Write to yourself for next season
          </Button>
        )}
        <Button variant="primary" onClick={close}>
          Lower the curtain
        </Button>
      </div>
    </section>
  );
}
