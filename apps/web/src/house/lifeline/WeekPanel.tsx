import {
  TONE_LABEL,
  WEEKS_PER_ROW,
  addDays,
  coordOf,
  formatMedium,
  formatRange,
  formatWeekday,
  parseISO,
  weekRange,
  type ContributionContext,
  type ImprintDefinition,
} from '@eternall/core';
import { Button, IconButton } from '@eternall/ui';
import { INSCRIPTION_PATH, type Inscription } from '../domain/house';
import type { LifelineModel } from '../domain/lifeline';
import { linkProps, navigate } from '../../shell/router';

interface Props {
  index: number;
  model: LifelineModel;
  ctx: ContributionContext;
  enabled: readonly ImprintDefinition[];
  onMove(i: number): void;
  onClose?(): void;
}

export function WeekPanel({ index, model, ctx, enabled, onMove, onClose }: Props) {
  const profile = ctx.profile!;
  const c = coordOf(index);
  const { start, end } = weekRange(profile.birthDate, c);
  const when = index < model.now ? 'lived' : index === model.now ? 'now' : 'ahead';
  const inscriptions = ctx.data
    .collection<Inscription>(INSCRIPTION_PATH)
    .all()
    .filter((i) => i.date >= start && i.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const lines = enabled.flatMap((d) => (d.weekLines?.(ctx, start, end) ?? []).map((l) => ({ ...l, def: d })));
  const total = model.total;
  const envoiOn = enabled.some((d) => d.id === 'envoi');

  // A future letter opens on the first day of the week, or tomorrow if this is the current week.
  const tomorrow = addDays(ctx.today, 1);
  const letterDate = parseISO(start) >= parseISO(tomorrow) ? start : tomorrow;
  const canWrite = envoiOn && parseISO(letterDate) <= parseISO(end);
  const inscribeDate = when === 'now' ? ctx.today : start;

  return (
    <section className="week-panel" aria-labelledby="week-panel-title" key={index}>
      <div className="week-panel__nav">
        <IconButton icon="up" label="Same week, previous year" disabled={index < WEEKS_PER_ROW} onClick={() => onMove(index - WEEKS_PER_ROW)} />
        <IconButton icon="left" label="Previous week" disabled={index === 0} onClick={() => onMove(index - 1)} />
        <IconButton icon="right" label="Next week" disabled={index >= total - 1} onClick={() => onMove(index + 1)} />
        <IconButton icon="down" label="Same week, next year" disabled={index + WEEKS_PER_ROW >= total} onClick={() => onMove(index + WEEKS_PER_ROW)} />
        <span className="week-panel__navspacer" />
        {index !== model.now && (
          <Button variant="quiet" size="s" icon="today" onClick={() => onMove(model.now)}>
            This week
          </Button>
        )}
        {onClose && <IconButton icon="close" label="Close week" onClick={onClose} className="week-panel__close" />}
      </div>

      <header className="week-panel__head">
        <p className="eyebrow">
          Age {c.age} · Week {c.week + 1}{' '}
          <span className={`week-badge week-badge--${when}`}>{when === 'now' ? 'This week' : when === 'lived' ? 'Lived' : 'Ahead'}</span>
        </p>
        <h2 id="week-panel-title" className="display week-panel__title">
          {formatRange(start, end)}
        </h2>
      </header>

      {inscriptions.length > 0 && (
        <ul className="week-panel__list" aria-label="Inscriptions this week">
          {inscriptions.map((ins, i) => (
            <li key={ins.id} className="rise" style={{ ['--i' as string]: i }}>
              <a className={`memory-row tone--${ins.tone}`} {...linkProps(`/inscriptions?open=${ins.id}`)}>
                <span className="tone-dot" aria-label={TONE_LABEL[ins.tone]} />
                <span className="memory-row__text">
                  <span className="memory-row__title">{ins.title}</span>
                  <span className="memory-row__meta mono">
                    {formatWeekday(ins.date)} · {formatMedium(ins.date)}
                  </span>
                  {ins.body && <span className="memory-row__excerpt">{ins.body}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <ul className="week-panel__list week-panel__imprints" aria-label="From your imprints">
          {lines.map((l, i) => (
            <li key={`${l.imprint}-${i}`}>
              <a className={`imprint-row ${l.emphasis === 'ready' ? 'is-ready' : ''}`} {...linkProps(l.href)}>
                <span className="imprint-row__name" style={{ ['--c' as string]: l.def.accent.light, ['--c-dark' as string]: l.def.accent.dark }}>
                  {l.def.name}
                </span>
                <span className="imprint-row__text">{l.text}</span>
                {l.emphasis === 'ready' && <span className="imprint-row__pulse" aria-hidden="true" />}
              </a>
            </li>
          ))}
        </ul>
      )}

      {inscriptions.length === 0 && lines.length === 0 && (
        <p className="week-panel__empty muted">
          {when === 'ahead'
            ? 'This week hasn’t happened yet. You could leave something waiting for it.'
            : when === 'now'
              ? 'You’re living this one right now. Anything worth keeping?'
              : 'Nothing inscribed. Most weeks slip by like this — catch one before it fades.'}
        </p>
      )}

      <div className="week-panel__actions">
        {when !== 'ahead' && (
          <Button variant="primary" icon="pen" onClick={() => navigate(`/inscriptions?new=1&date=${inscribeDate}`)}>
            Inscribe this week
          </Button>
        )}
        {when !== 'lived' && canWrite && (
          <Button variant={when === 'ahead' ? 'accent' : 'ghost'} icon="seal" onClick={() => navigate(`/envoi/write?opensOn=${letterDate}`)}>
            {when === 'ahead' ? 'Write a letter for this week' : 'Write to the future'}
          </Button>
        )}
      </div>
    </section>
  );
}
