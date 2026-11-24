import { useState } from 'react';
import { formatMedium } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { Button, Dialog } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { practiceWeeks } from '../days';
import { routeen } from '../index';
import { PRACTICE_PATH, barStart, cadenceLabel, timeOf, type Practice } from '../practices';
import { Tile } from './Tile';
import type { Routine } from './useRoutine';

/**
 * One practice (spec §4.2, §4.6): its facts, its year as a strip of week tiles at their brightest,
 * and edit, pause or resume, and remove (which confirms, and offers Undo).
 */
export function PracticePage({ practice: p, routine: r, onEdit }: { practice: Practice; routine: Routine; onEdit(): void }) {
  const house = useHouse();
  const { col } = useCollection<Practice>(PRACTICE_PATH);
  const [confirm, setConfirm] = useState(false);
  const lit = r.marks.filter((m) => m.ritualId === p.id).length;
  const weeks = practiceWeeks(p, r.idx, r.today, r.modeOf);
  const thisWeek = barStart(r.today);

  const pause = () => {
    // Only the known fields: a loom-era record's thread, pitch and instrument are never written back.
    const { id, name, why, cadence, timeOfDay, measure, startedOn } = p;
    col.put({ id, name, why, cadence, ...(timeOfDay ? { timeOfDay } : {}), ...(measure ? { measure } : {}), startedOn, pausedOn: p.pausedOn ? null : r.today });
    house.toast({ message: p.pausedOn ? copy.toast.resumed(p.name) : copy.toast.paused(p.name) });
  };
  const remove = () => {
    col.remove(p.id);
    house.navigate(house.href('/'));
    house.toast({ message: copy.toast.removed(p.name), action: { label: copy.toast.undo, run: () => col.put(p) } });
  };

  return (
    <article className="rs-practice">
      <header className="rs-head">
        <h1 className="rs-title">{p.name}</h1>
        {p.why && <p className="rs-why">“{p.why}”</p>}
      </header>
      <dl className="rs-facts">
        <div>
          <dt>{copy.practice.howOften}</dt>
          <dd>{cadenceLabel(p.cadence)}</dd>
        </div>
        <div>
          <dt>{copy.practice.when}</dt>
          <dd>{copy.times[timeOf(p)]}</dd>
        </div>
        {p.measure && (
          <div>
            <dt>{copy.practice.measure}</dt>
            <dd>{copy.practice.measureLine(p.measure.minimum, p.measure.target, p.measure.unit)}</dd>
          </div>
        )}
        <div>
          <dt>{copy.practice.since}</dt>
          <dd>{formatMedium(p.startedOn)}</dd>
        </div>
        <div>
          <dt>{copy.practice.lit}</dt>
          <dd>{copy.practice.litCount(lit)}</dd>
        </div>
        {p.pausedOn && (
          <div>
            <dt>{copy.practice.paused}</dt>
            <dd>{formatMedium(p.pausedOn)}</dd>
          </div>
        )}
      </dl>

      <ol className="rs-strip" aria-label={copy.practice.history}>
        {weeks.map((w) => (
          <li key={w.date}>
            <Tile sky={w} today={thisWeek} week />
          </li>
        ))}
      </ol>

      <div className="rs-actions">
        <Button variant="ghost" icon="pen" onClick={onEdit}>
          {copy.editPractice}
        </Button>
        <Button variant="quiet" onClick={pause}>
          {p.pausedOn ? copy.dialog.resume : copy.dialog.pause}
        </Button>
        <Button variant="quiet" icon="trash" onClick={() => setConfirm(true)}>
          {copy.practice.remove}
        </Button>
      </div>

      {confirm && (
        <Dialog
          open
          title={copy.practice.removeTitle(p.name)}
          eyebrow={routeen.name}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <span className="spacer" />
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                {copy.dialog.cancel}
              </Button>
              <Button variant="danger" onClick={remove}>
                {copy.practice.removeYes}
              </Button>
            </>
          }
        >
          <p className="muted">{copy.practice.removeBody}</p>
        </Dialog>
      )}
    </article>
  );
}
