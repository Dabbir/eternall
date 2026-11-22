import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/im-fell-english/latin-400-italic.css';
import '@fontsource/im-fell-english-sc/latin-400.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '../theme/almanack.css';
import { useMemo, useState } from 'react';
import {
  TONES,
  TONE_LABEL,
  diffDays,
  formatCompact,
  formatLong,
  formatMedium,
  formatNumber,
  locate,
  ordinal,
  parseISO,
  plural,
  weekIndex,
} from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button } from '@eternall/ui';
import { echoes, measure, perYear, streaks, toneClimate, weekNumbers } from '../stats';
import { Orrery } from './Orrery';

const LUNAR = 29.530588;
const KNOWN_NEW_MOON = parseISO('2000-01-06');

export default function AlmanackApp() {
  const house = useHouse();
  const { profile, today } = house;
  const memories = useMemo(() => house.gather.memories(), [house]);
  const facts = useMemo(() => house.gather.facts(), [house]);
  const redLetters = useMemo(
    () =>
      house.gather
        .redLetterDays()
        .filter((d) => d.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8),
    [house, today],
  );
  const firstRecord = memories.reduce<string | null>((min, m) => (!min || m.date < min ? m.date : min), null);
  const m = measure(profile, today, firstRecord);
  const echoList = echoes(memories, profile, today).slice(0, 6);
  const years = perYear(memories, profile, today);
  const climate = toneClimate(memories);
  const nowWeek = profile ? weekIndex(locate(profile.birthDate, today) ?? { age: 0, week: 0 }) : Math.floor(diffDays(m.since, today) / 7);
  const weekSet = profile ? new Set(memories.map((x) => (locate(profile.birthDate, x.date) ? weekIndex(locate(profile.birthDate, x.date)!) : -1))) : weekNumbers(memories, m.since);
  const st = streaks(weekSet, nowWeek);
  const moonPhase = (((parseISO(today) - KNOWN_NEW_MOON) % LUNAR) + LUNAR) % LUNAR / LUNAR;
  const pct = m.fractionLived !== null ? (m.fractionLived * 100).toFixed(1) : null;
  const title = profile ? `for the ${ordinal((m.age ?? 0) + 1)} year of ${profile.name.toUpperCase()}’s life` : `since ${formatLong(m.since)}`;

  return (
    <div className="alm">
      <header className="alm-head">
        <p className="alm-eyebrow">ALMANACK · Measures &amp; reflections</p>
        <h1 className="alm-title">The Almanack</h1>
        <p className="alm-sub">{title}</p>
        <p className="alm-date">Calculated {formatLong(today)}</p>
      </header>

      {!profile && (
        <aside className="alm-note">
          <p>
            Without a birth date, ALMANACK measures from your first record. <button type="button" className="alm-link" onClick={() => house.navigate('/begin')}>Add your birth date</button> to measure your whole life.
          </p>
        </aside>
      )}

      <figure className="alm-plate">
        <Orrery fraction={m.fractionLived} decades={profile ? Math.ceil(profile.horizonYears / 10) : 6} moonPhase={moonPhase} label={pct ? `Engraved orrery: ${pct}% of a ${profile!.horizonYears}-year horizon lived; the moon is ${Math.round(moonPhase * 100)}% through its cycle.` : 'Engraved orrery of your years.'} />
        <figcaption>
          <span className="alm-plate__no">Plate I.</span> The orrery of your years{pct ? ` — ${pct} parts in a hundred of the horizon lived.` : '.'}
        </figcaption>
      </figure>

      <div className="alm-cols">
        <section aria-labelledby="alm-lived">
          <h2 id="alm-lived" className="alm-h2">Of time lived</h2>
          <table className="alm-table">
            <tbody>
              <Row label="Weeks" value={formatNumber(m.weeksLived)} />
              <Row label="Sunrises" value={formatNumber(m.sunrises)} />
              <Row label="Full moons" value={formatNumber(m.fullMoons)} />
              <Row label="Seasons turned" value={formatNumber(m.seasons)} />
              <Row label="Heartbeats" value={formatCompact(m.heartbeats)} note="roughly, at rest" />
            </tbody>
          </table>
        </section>
        <section aria-labelledby="alm-ahead">
          <h2 id="alm-ahead" className="alm-h2">Of time ahead</h2>
          {profile ? (
            <table className="alm-table">
              <tbody>
                <Row label="Weeks" value={formatNumber(m.weeksRemaining ?? 0)} />
                <Row label="Summers" value={formatNumber(m.summersAhead ?? 0)} rubric />
                <Row label="Weekends" value={formatNumber(m.weekendsAhead ?? 0)} />
                <Row label="Horizon" value={`${profile.horizonYears} years`} note="a horizon, not a prophecy" />
              </tbody>
            </table>
          ) : (
            <p className="alm-empty">Time ahead is measured against your horizon, once you add a birth date.</p>
          )}
        </section>
      </div>

      <div className="alm-cols">
        <section aria-labelledby="alm-echoes">
          <h2 id="alm-echoes" className="alm-h2">Echoes</h2>
          <p className="alm-h2-note">This same week, in years gone by.</p>
          {echoList.length ? (
            <ol className="alm-echoes">
              {echoList.map((e) => (
                <li key={`${e.imprint}-${e.id}`}>
                  <button type="button" className="alm-echo" onClick={() => house.navigate(e.href)}>
                    <span className="alm-echo__ago">{plural(Number(today.slice(0, 4)) - Number(e.date.slice(0, 4)), 'year')} ago</span>
                    <span className="alm-echo__title">{e.title}</span>
                    <span className="alm-echo__date">{formatMedium(e.date)}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="alm-empty">Echoes appear here once you’ve kept this week in earlier years.</p>
          )}
        </section>
        <section aria-labelledby="alm-practice">
          <h2 id="alm-practice" className="alm-h2">Of keeping</h2>
          <table className="alm-table">
            <tbody>
              <Row label="Memories kept" value={formatNumber(memories.length)} />
              <Row label="Weeks with a memory" value={formatNumber(weekSet.size)} />
              <Row label="Longest run" value={plural(st.longest, 'week')} />
              <Row label="Current run" value={plural(st.current, 'week')} rubric={st.current > 0} />
              {facts.map((f) => (
                <Row key={`${f.imprint}-${f.label}`} label={f.label} value={f.value} {...(f.note ? { note: f.note } : {})} />
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="alm-section" aria-labelledby="alm-red">
        <h2 id="alm-red" className="alm-h2">Red-letter days ahead</h2>
        {redLetters.length ? (
          <ul className="alm-red">
            {redLetters.map((d) => (
              <li key={`${d.imprint}-${d.date}-${d.label}`}>
                <button type="button" className="alm-red__row" onClick={() => house.navigate(d.href)}>
                  <span className="alm-red__mark" aria-hidden="true">⟡</span>
                  <span className="alm-red__date">{formatMedium(d.date)}</span>
                  <span className="alm-red__label">{d.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="alm-empty">No dates marked ahead. Letters sealed in ENVOI appear here as red-letter days.</p>
        )}
      </section>

      <section className="alm-section" aria-labelledby="alm-weather">
        <h2 id="alm-weather" className="alm-h2">The weather of memory</h2>
        <Weather climate={climate} />
      </section>

      <section className="alm-section" aria-labelledby="alm-years">
        <h2 id="alm-years" className="alm-h2">Memories by year {profile ? 'of life' : ''}</h2>
        <Years data={years} />
      </section>
    </div>
  );
}

function Row({ label, value, note, rubric = false }: { label: string; value: string; note?: string; rubric?: boolean }) {
  return (
    <tr className={rubric ? 'is-rubric' : undefined}>
      <th scope="row">
        <span className="alm-table__label">{label}</span>
        {note && <span className="alm-table__note">{note}</span>}
      </th>
      <td>{value}</td>
    </tr>
  );
}

function Weather({ climate }: { climate: Record<(typeof TONES)[number], number> }) {
  const total = TONES.reduce((s, t) => s + climate[t], 0);
  if (!total) return <p className="alm-empty">Each memory carries a tone. Once you have a few, the climate of what you remember appears here.</p>;
  const max = Math.max(...TONES.map((t) => climate[t]));
  return (
    <table className="alm-weather">
      <caption className="visually-hidden">Memories by tone</caption>
      <tbody>
        {TONES.map((t) => (
          <tr key={t} className={`tone--${t}`}>
            <th scope="row">{TONE_LABEL[t]}</th>
            <td className="alm-weather__bar" aria-hidden="true">
              <span style={{ width: `${(climate[t] / max) * 100}%` }} />
            </td>
            <td className="alm-weather__n">{climate[t]}</td>
            <td className="alm-weather__pct">{Math.round((climate[t] / total) * 100)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Years({ data }: { data: { key: number; label: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return <p className="alm-empty">The shape of your remembered years appears once you keep a few memories.</p>;
  const max = Math.max(1, ...data.map((d) => d.count));
  const h = data[hover ?? -1];
  return (
    <figure className="alm-years">
      <div className="alm-years__plot" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            className={`alm-years__bar ${hover === i ? 'is-hover' : ''}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${d.label}: ${plural(d.count, 'memory', 'memories')}`}
          >
            <span style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : 0 }} />
          </button>
        ))}
        {h && (
          <div className="alm-years__tip" style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}>
            {h.label} · {plural(h.count, 'memory', 'memories')}
          </div>
        )}
      </div>
      <div className="alm-years__axis" aria-hidden="true">
        <span>{data[0]?.label.split(' · ')[0]}</span>
        <span>{data[data.length - 1]?.label.split(' · ')[0]}</span>
      </div>
      <Button variant="quiet" size="s" onClick={() => setTable((t) => !t)} aria-expanded={table}>
        {table ? 'Hide table' : 'Show as table'}
      </Button>
      {table && (
        <table className="alm-table alm-table--compact">
          <tbody>
            {data
              .filter((d) => d.count)
              .map((d) => (
                <Row key={d.key} label={d.label} value={String(d.count)} />
              ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
