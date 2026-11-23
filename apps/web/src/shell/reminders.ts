import { useEffect, useRef, useState } from 'react';
import { addDays, type Contributor, type ISODate, type ReadContext, type Reminder } from '@eternall/core';
import { useCollection } from '@eternall/vault';
import { useToast } from '@eternall/ui';
import { navigate } from './router';

/**
 * Local reminders (docs/FLOWS.md §Reminders). Imprints say what is due today; the house delivers
 * each key once — as a toast while you are looking, or as a system notification when the app is
 * open in the background and you allowed it. The log syncs, so a second device stays quiet.
 * Nothing is scheduled on a server: a closed app reminds no one, and the UI says so.
 */
export const REMINDER_LOG_PATH = 'house/reminders';
export interface ReminderLog {
  id: 'log';
  sent: { key: string; date: ISODate }[];
}
const LATE_DAYS = 7;

/** Reminders still owed: due within the last week, not yet sent, in a stable order. */
export function pendingReminders(all: readonly Reminder[], log: ReminderLog | undefined, today: ISODate): Reminder[] {
  const sent = new Set(log?.sent.map((s) => s.key));
  const oldest = addDays(today, -LATE_DAYS);
  const seen = new Set<string>();
  return all
    .filter((r) => r.date <= today && r.date >= oldest && !sent.has(r.key) && !seen.has(r.key) && seen.add(r.key))
    .sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
}

/** The log after sending `keys`, forgetting entries older than the late window. */
export function recordSent(log: ReminderLog | undefined, sent: readonly Reminder[], today: ISODate): ReminderLog {
  const oldest = addDays(today, -LATE_DAYS - 7);
  const kept = (log?.sent ?? []).filter((s) => s.date >= oldest);
  return { id: 'log', sent: [...kept, ...sent.map((r) => ({ key: r.key, date: r.date }))] };
}

export function systemNotificationsAvailable(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

async function notifySystem(r: Reminder): Promise<boolean> {
  if (!systemNotificationsAvailable() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  await reg.showNotification(r.title, { body: r.body, tag: r.key, data: { href: r.href }, icon: '/brand/icon-192.png' });
  return true;
}

function useVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

export function useReminders(enabled: readonly Contributor[], ctx: ReadContext, system: boolean): void {
  const { col } = useCollection<ReminderLog>(REMINDER_LOG_PATH);
  const toast = useToast();
  const visible = useVisible();
  const log = col.get('log');
  // Keys being delivered right now: the effect re-runs on every vault change, never twice per key.
  const inflight = useRef(new Set<string>());
  useEffect(() => {
    const due = pendingReminders(
      enabled.flatMap((d) => d.reminders?.(ctx) ?? []),
      log,
      ctx.today,
    ).filter((r) => !inflight.current.has(r.key));
    if (!due.length) return;
    for (const r of due) inflight.current.add(r.key);
    void (async () => {
      const sent: Reminder[] = [];
      for (const r of due) {
        if (visible) {
          toast({ message: r.body ? `${r.title}. ${r.body}` : `${r.title}.`, tone: 'accent', duration: 12_000, action: { label: 'Open', run: () => navigate(r.href) } });
          sent.push(r);
        } else if (system && (await notifySystem(r).catch(() => false))) {
          sent.push(r);
        }
        // Otherwise it waits until the page is looked at again.
      }
      if (sent.length) col.put(recordSent(col.get('log'), sent, ctx.today));
      for (const r of due) inflight.current.delete(r.key);
    })();
  }, [enabled, ctx, log, visible, system, toast, col]);
}
