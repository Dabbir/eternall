import { useEffect, useMemo, useState } from 'react';
import type { ISODate } from '@eternall/core';
import { useHouse } from '@eternall/kit';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { indexMarks, type MarkIndex } from '../days';
import { clock } from '../index';
import { DAY_MODE_PATH, MODE_PATH, dayModeChange, modeOfFn, isModeUnchanged, modeRecord, type DayModeRecord, type Mode, type ModeOf, type ModeRecord } from '../modes';
import { MARK_PATH, PRACTICE_PATH, markId, type Mark, type Practice, type Tier } from '../practices';
import { SETTINGS_PATH, readSettings, routineDay, type RouteenSettings } from '../sky';

/** The moment, refreshed on each minute boundary and whenever the page comes back into view. */
export function useNow(): Date {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = clock.now();
      setNow(t);
      timer = setTimeout(tick, 60_000 - (t.getSeconds() * 1000 + t.getMilliseconds()) + 5);
    };
    const first = clock.now();
    timer = setTimeout(tick, 60_000 - (first.getSeconds() * 1000 + first.getMilliseconds()) + 5);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(clock.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}

export interface Routine {
  practices: Practice[];
  marks: Mark[];
  idx: MarkIndex;
  modes: ModeRecord[];
  dayModes: DayModeRecord[];
  settings: RouteenSettings;
  modeOf: ModeOf;
  /** The one clock every page reads, so every write keys by the same day. */
  now: Date;
  /** The routine day (it ends at `settings.dayEndsAt`), never the shell's midnight day. */
  today: ISODate;
  /** `null` removes the mark. Toasts with Undo. */
  setTier(p: Practice, date: ISODate, tier: Tier | null): void;
  /** The running mode from today on. */
  setMode(mode: Mode): void;
  /** One day's own mode. */
  setDayMode(date: ISODate, mode: Mode): void;
  /** Writes several marks at once. Toasts with Undo. */
  putMarks(ms: Mark[]): void;
  saveSettings(s: RouteenSettings): void;
}

/** Every record ROUTEEN reads, and the few writes it makes, through the vault. */
export function useRoutine(): Routine {
  const house = useHouse();
  const now = useNow();
  const practiceCol = useCollection<Practice>(PRACTICE_PATH);
  const markCol = useCollection<Mark>(MARK_PATH);
  const modeCol = useCollection<ModeRecord>(MODE_PATH);
  const dayModeCol = useCollection<DayModeRecord>(DAY_MODE_PATH);
  const settingsCol = useCollection<RouteenSettings>(SETTINGS_PATH);

  const practices = practiceCol.items as Practice[];
  const marks = markCol.items as Mark[];
  const modes = modeCol.items as ModeRecord[];
  const dayModes = dayModeCol.items as DayModeRecord[];
  const settings = readSettings(settingsCol.items.find((s) => s.id === 'settings'));
  const today = routineDay(now, settings.dayEndsAt);
  const idx = useMemo(() => indexMarks(marks), [marks]);
  const modeOf = useMemo(() => modeOfFn(modes, dayModes), [modes, dayModes]);

  const marksCol = markCol.col;
  const setTier = (p: Practice, date: ISODate, tier: Tier | null) => {
    const id = markId(p.id, date);
    const prev = marksCol.get(id);
    const restore = () => (prev ? marksCol.put(prev) : marksCol.remove(id));
    if (tier === null) {
      marksCol.remove(id);
      house.toast({ message: copy.toast.unmarked(p.name), ...(prev ? { action: { label: copy.toast.undo, run: restore } } : {}) });
      return;
    }
    marksCol.put({ id, ritualId: p.id, date, tier });
    house.toast({ message: copy.toast.marked(p.name), tone: 'accent', action: { label: copy.toast.undo, run: restore } });
  };

  const putMarks = (ms: Mark[]) => {
    if (!ms.length) return;
    const prevs = ms.map((m) => marksCol.get(m.id));
    for (const m of ms) marksCol.put(m);
    house.toast({
      message: copy.toast.allMarked(ms.length),
      tone: 'accent',
      action: {
        label: copy.toast.undo,
        run: () =>
          ms.forEach((m, i) => {
            const prev = prevs[i];
            if (prev) marksCol.put(prev);
            else marksCol.remove(m.id);
          }),
      },
    });
  };

  const setMode = (mode: Mode) => {
    // Choosing the mode already running (and no day override) changes nothing: keep its clock and say nothing.
    if (isModeUnchanged(today, mode, modes, dayModes)) return;
    const prev = modeCol.col.get(today);
    const prevDay = dayModeCol.col.get(today);
    modeCol.col.put(modeRecord(today, mode));
    // A mode chosen for the routine applies today too, so today's own override gives way.
    if (prevDay) dayModeCol.col.remove(today);
    house.toast({
      message: copy.toast.modeSet(copy.modes[mode]),
      action: {
        label: copy.toast.undo,
        run: () => {
          if (prev) modeCol.col.put(prev);
          else modeCol.col.remove(today);
          if (prevDay) dayModeCol.col.put(prevDay);
        },
      },
    });
  };

  const setDayMode = (date: ISODate, mode: Mode) => {
    const change = dayModeChange(date, mode, modes);
    if ('put' in change) dayModeCol.col.put(change.put);
    else dayModeCol.col.remove(change.remove);
  };

  const saveSettings = (s: RouteenSettings) => {
    settingsCol.col.put(s);
  };

  return { practices, marks, idx, modes, dayModes, settings, modeOf, now, today, setTier, setMode, setDayMode, putMarks, saveSettings };
}
