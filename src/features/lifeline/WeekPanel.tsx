import { capsuleStatus } from '../../domain/capsule';
import { chapterAt } from '../../domain/lifeline';
import { WEEKS_PER_ROW, coordOf, isWithin, parseISO, weekRange } from '../../domain/time';
import { TONE_LABEL } from '../../domain/types';
import { earliestOpening } from '../../domain/validation';
import { formatCountdown, formatMedium, formatRange, formatWeekday } from '../../lib/format';
import { useProfileStore } from '../../store/StoreProvider';
import { Button, IconButton } from '../../components/ui/Button';
import { Seal } from '../../components/ui/Seal';
import { useEditors } from '../editors/EditorsProvider';

export function WeekPanel({ index, onMove, onClose }: { index: number; onMove: (i: number) => void; onClose?: () => void }) {
  const { profile, data, today, lifeline } = useProfileStore();
  const editors = useEditors();
  const c = coordOf(index);
  const { start, end } = weekRange(profile.birthDate, c);
  const when = index < lifeline.now ? 'lived' : index === lifeline.now ? 'now' : 'ahead';
  const inscriptions = lifeline.inscriptionsByWeek.get(index) ?? [];
  const capsules = data.capsules.filter((cap) => isWithin(cap.opensOn, start, end));
  const chapter = chapterAt(data.chapters, profile, index, today);
  const total = lifeline.total;

  // A future capsule opens on the first day of the week, or tomorrow if this is the current week.
  const capsuleDate = parseISO(start) >= parseISO(earliestOpening(today)) ? start : earliestOpening(today);
  const canSeal = parseISO(capsuleDate) <= parseISO(end);
  const inscribeDate = when === 'now' ? today : start;

  return (
    <section className="week-panel" aria-labelledby="week-panel-title" key={index}>
      <div className="week-panel__nav">
        <IconButton icon="up" label="Same week, previous year" disabled={index < WEEKS_PER_ROW} onClick={() => onMove(index - WEEKS_PER_ROW)} />
        <IconButton icon="left" label="Previous week" disabled={index === 0} onClick={() => onMove(index - 1)} />
        <IconButton icon="right" label="Next week" disabled={index >= total - 1} onClick={() => onMove(index + 1)} />
        <IconButton icon="down" label="Same week, next year" disabled={index + WEEKS_PER_ROW >= total} onClick={() => onMove(index + WEEKS_PER_ROW)} />
        <span className="week-panel__navspacer" />
        {index !== lifeline.now && <Button variant="quiet" size="s" icon="today" onClick={() => onMove(lifeline.now)}>This week</Button>}
        {onClose && <IconButton icon="close" label="Close week" onClick={onClose} className="week-panel__close" />}
      </div>

      <header className="week-panel__head">
        <p className="eyebrow">
          Age {c.age} · Week {c.week + 1} <span className={`week-badge week-badge--${when}`}>{when === 'now' ? 'This week' : when === 'lived' ? 'Lived' : 'Ahead'}</span>
        </p>
        <h2 id="week-panel-title" className="display week-panel__title">{formatRange(start, end)}</h2>
        {chapter && (
          <p className={`week-panel__chapter ink--${chapter.ink}`}>
            <span className="tone-dot" aria-hidden="true" /> {chapter.title}
          </p>
        )}
      </header>

      {inscriptions.length > 0 && (
        <ul className="week-panel__list" aria-label="Memories this week">
          {inscriptions.map((ins, i) => (
            <li key={ins.id} className="rise" style={{ ['--i' as string]: i }}>
              <button type="button" className={`memory-row tone--${ins.tone}`} onClick={() => editors.inscribe({ existing: ins })}>
                <span className="tone-dot" aria-label={TONE_LABEL[ins.tone]} />
                <span className="memory-row__text">
                  <span className="memory-row__title">{ins.title}</span>
                  <span className="memory-row__meta mono">{formatWeekday(ins.date)} · {formatMedium(ins.date)}</span>
                  {ins.body && <span className="memory-row__excerpt">{ins.body}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {capsules.length > 0 && (
        <ul className="week-panel__list" aria-label="Capsules this week">
          {capsules.map((cap) => {
            const s = capsuleStatus(cap, today);
            return (
              <li key={cap.id}>
                <button type="button" className={`capsule-row capsule-row--${s}`} onClick={() => editors.readCapsule(cap.id)}>
                  <Seal fingerprint={cap.fingerprint} initial={profile.name} size={40} />
                  <span className="memory-row__text">
                    <span className="memory-row__title">{cap.title}</span>
                    <span className="memory-row__meta mono">
                      {s === 'sealed' ? `Opens ${formatCountdown(today, cap.opensOn)}` : s === 'ready' ? 'Ready to open' : `Opened · sealed ${formatMedium(cap.sealedOn)}`}
                    </span>
                  </span>
                  {s === 'ready' && <span className="capsule-row__pulse" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {inscriptions.length === 0 && capsules.length === 0 && (
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
          <Button variant="primary" icon="pen" onClick={() => editors.inscribe({ date: inscribeDate })}>
            Inscribe this week
          </Button>
        )}
        {when !== 'lived' && canSeal && (
          <Button variant={when === 'ahead' ? 'seal' : 'ghost'} icon="seal" onClick={() => editors.composeCapsule({ opensOn: capsuleDate })}>
            {when === 'ahead' ? 'Seal a letter for this week' : 'Write to the future'}
          </Button>
        )}
      </div>
    </section>
  );
}
