import { useState } from 'react';
import { capsuleStatus } from '../../domain/capsule';
import { locate } from '../../domain/time';
import { TONES, TONE_LABEL, type Tone } from '../../domain/types';
import { formatCompact, formatCountdown, formatLong, formatMedium, formatNumber, plural } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Seal } from '../../components/ui/Seal';
import { useEditors } from '../editors/EditorsProvider';

export function AlmanacView() {
  const { profile, almanac: a, data, today } = useProfileStore();
  const editors = useEditors();
  const pct = (a.fractionLived * 100).toFixed(1);
  const ready = data.capsules.filter((c) => capsuleStatus(c, today) === 'ready');

  return (
    <div className="almanac">
      <header className="page-head">
        <p className="eyebrow rise">The almanac · as of {formatLong(today)}</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          A life, <em>measured gently.</em>
        </h1>
      </header>

      <section className="almanac-hero rise" style={{ ['--i' as string]: 2 }} aria-labelledby="alm-hero">
        <p id="alm-hero" className="almanac-hero__num display tabular">
          {pct}<span>%</span>
        </p>
        <div className="almanac-hero__text">
          <p className="almanac-hero__lede">
            of a {profile.horizonYears}-year horizon is behind you. You have lived <strong>{formatNumber(a.weeksLived)}</strong> weeks;{' '}
            <strong>{formatNumber(a.weeksRemaining)}</strong> remain.
          </p>
          <div className="almanac-hero__bar" role="img" aria-label={`${pct}% of the horizon lived`}>
            <span style={{ width: `${a.fractionLived * 100}%` }} />
          </div>
          <p className="faint almanac-hero__note">Not a prediction. A horizon you chose — a way of seeing that time is finite and therefore precious.</p>
        </div>
      </section>

      <section className="almanac-section" aria-labelledby="alm-measures">
        <header className="section-head">
          <h2 id="alm-measures" className="display">Measured in other ways</h2>
        </header>
        <dl className="measures">
          <Measure label="Sunrises seen" value={formatNumber(a.measures.sunrises)} />
          <Measure label="Full moons" value={formatNumber(a.measures.fullMoons)} />
          <Measure label="Seasons turned" value={formatNumber(a.measures.seasons)} />
          <Measure label="Heartbeats, roughly" value={formatCompact(a.measures.heartbeats)} />
          <Measure label="Summers ahead" value={formatNumber(a.measures.summersAhead)} accent />
          <Measure label="Weekends ahead" value={formatNumber(a.measures.weekendsAhead)} accent />
        </dl>
      </section>

      <div className="almanac-cols">
        <section className="almanac-section" aria-labelledby="alm-echoes">
          <header className="section-head">
            <h2 id="alm-echoes" className="display">Echoes</h2>
            <p className="faint">Week {a.weekOfYear + 1} of earlier years.</p>
          </header>
          {a.echoes.length ? (
            <ul className="echoes">
              {a.echoes.slice(0, 6).map((ins) => {
                const c = locate(profile.birthDate, ins.date);
                return (
                  <li key={ins.id}>
                    <button type="button" className={`echo tone--${ins.tone}`} onClick={() => editors.inscribe({ existing: ins })}>
                      <span className="echo__ago mono">{plural(a.age - (c?.age ?? 0), 'year')} ago</span>
                      <span className="echo__title display">{ins.title}</span>
                      <span className="echo__date faint">
                        <span className="tone-dot" aria-hidden="true" /> {formatMedium(ins.date)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted almanac-empty">
              Nothing inscribed in this week of earlier years. Memories you add to past weeks will echo back here every year.
            </p>
          )}
        </section>

        <section className="almanac-section" aria-labelledby="alm-practice">
          <header className="section-head">
            <h2 id="alm-practice" className="display">Your practice</h2>
          </header>
          <dl className="measures measures--compact">
            <Measure label="Weeks inscribed" value={formatNumber(a.inscribedWeeks)} />
            <Measure label="Of lived weeks" value={`${(a.coverage * 100).toFixed(1)}%`} />
            <Measure label="Longest streak" value={plural(a.longestStreak, 'week')} />
            <Measure label="Current streak" value={plural(a.currentStreak, 'week')} accent={a.currentStreak > 0} />
          </dl>
          <div className="next-capsule">
            {ready.length > 0 ? (
              <button type="button" className="next-capsule__card is-ready" onClick={() => editors.readCapsule(ready[0]!.id)}>
                <Seal fingerprint={ready[0]!.fingerprint} initial={profile.name} size={44} />
                <span><strong>{ready[0]!.title}</strong><span className="faint"> is ready to open.</span></span>
              </button>
            ) : a.nextCapsule ? (
              <button type="button" className="next-capsule__card" onClick={() => editors.readCapsule(a.nextCapsule!.id)}>
                <Seal fingerprint={a.nextCapsule.fingerprint} initial={profile.name} size={44} />
                <span>
                  Next letter opens <strong>{formatCountdown(today, a.nextCapsule.opensOn)}</strong>
                  <span className="faint"> · {formatLong(a.nextCapsule.opensOn)}</span>
                </span>
              </button>
            ) : (
              <Button variant="ghost" icon="seal" onClick={() => editors.composeCapsule()}>Seal a letter to your future</Button>
            )}
          </div>
        </section>
      </div>

      <section className="almanac-section" aria-labelledby="alm-years">
        <header className="section-head">
          <h2 id="alm-years" className="display">Inscriptions by year of life</h2>
          <p className="faint">Click a year to see it on your lifeline.</p>
        </header>
        <YearChart perAge={a.perAge} />
      </section>

      <section className="almanac-section" aria-labelledby="alm-tones">
        <header className="section-head">
          <h2 id="alm-tones" className="display">The weather of your memories</h2>
        </header>
        <ToneChart tones={a.tones} />
      </section>
    </div>
  );
}

function Measure({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`measure ${accent ? 'is-accent' : ''}`}>
      <dt className="eyebrow">{label}</dt>
      <dd className="display tabular">{value}</dd>
    </div>
  );
}

function YearChart({ perAge }: { perAge: number[] }) {
  const { profile } = useProfileStore();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...perAge);
  const total = perAge.reduce((s, n) => s + n, 0);
  if (!total) return <p className="muted almanac-empty">Inscribe memories in past weeks and the shape of your remembered life will appear here.</p>;
  const W = 100;
  const H = 40;
  const bw = W / perAge.length;
  const ticks = [0, Math.round(max / 2), max].filter((v, i, xs) => xs.indexOf(v) === i);
  const birthYear = Number(profile.birthDate.slice(0, 4));

  return (
    <figure className="year-chart">
      <div className="year-chart__plot" onMouseLeave={() => setHover(null)}>
        <div className="year-chart__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{t}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="year-chart__svg" aria-hidden="true">
          {ticks.map((t) => (
            <line key={t} x1="0" x2={W} y1={H - (t / max) * H} y2={H - (t / max) * H} className="year-chart__grid" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="year-chart__bars">
          {perAge.map((n, age) => (
            <button
              key={age}
              type="button"
              className={`year-chart__bar ${hover === age ? 'is-hover' : ''}`}
              style={{ width: `${bw}%` }}
              onMouseEnter={() => setHover(age)}
              onFocus={() => setHover(age)}
              onBlur={() => setHover(null)}
              onClick={() => navigate('lifeline', { week: age * 52 })}
              aria-label={`Age ${age}: ${plural(n, 'inscription')}`}
            >
              <span style={{ height: n ? `${Math.max(3, (n / max) * 100)}%` : 0 }} />
            </button>
          ))}
        </div>
        {hover !== null && (
          <div className="chart-tip" style={{ left: `${(hover + 0.5) * bw}%` }} role="presentation">
            <span className="mono">Age {hover} · {birthYear + hover}</span>
            <strong>{plural(perAge[hover] ?? 0, 'inscription')}</strong>
          </div>
        )}
      </div>
      <div className="year-chart__x mono" aria-hidden="true">
        {perAge.map((_, age) => (age % 10 === 0 ? <span key={age} style={{ left: `${(age + 0.5) * bw}%` }}>{age}</span> : null))}
      </div>
      <details className="table-view">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th scope="col">Age</th><th scope="col">Year</th><th scope="col">Inscriptions</th></tr></thead>
          <tbody>
            {perAge.map((n, age) => n > 0 && (
              <tr key={age}><td>{age}</td><td>{birthYear + age}</td><td>{n}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function ToneChart({ tones }: { tones: Record<Tone, number> }) {
  const [hover, setHover] = useState<Tone | null>(null);
  const total = TONES.reduce((s, t) => s + tones[t], 0);
  if (!total) return <p className="muted almanac-empty">Each inscription carries a tone. Once you have a few, you’ll see the climate of what you choose to remember.</p>;
  const present = TONES.filter((t) => tones[t] > 0);
  return (
    <figure className="tone-chart">
      <div className="tone-chart__bar" onMouseLeave={() => setHover(null)}>
        {present.map((t) => (
          <span
            key={t}
            className={`tone-chart__seg tone--${t} ${hover && hover !== t ? 'is-dim' : ''}`}
            style={{ flexGrow: tones[t] }}
            onMouseEnter={() => setHover(t)}
            title={`${TONE_LABEL[t]}: ${tones[t]}`}
          />
        ))}
      </div>
      <ul className="tone-chart__legend">
        {TONES.map((t) => (
          <li
            key={t}
            className={`tone--${t} ${hover === t ? 'is-hover' : ''} ${tones[t] === 0 ? 'is-zero' : ''}`}
            onMouseEnter={() => setHover(t)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="tone-dot" aria-hidden="true" />
            <span className="tone-chart__name">{TONE_LABEL[t]}</span>
            <span className="mono tabular">{tones[t]}</span>
            <span className="mono faint tabular">{Math.round((tones[t] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

