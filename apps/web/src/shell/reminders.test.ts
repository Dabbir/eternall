import type { Reminder } from '@eternall/core';
import { pendingReminders, recordSent, type ReminderLog } from './reminders';

const r = (key: string, date: string): Reminder => ({ imprint: 'kindred', key, date, title: key, body: '', href: '/kindred/' });
const today = '2026-12-02';

describe('reminders', () => {
  it('owes each key once, within the last week, oldest first', () => {
    const all = [r('b', today), r('a', '2026-11-30'), r('old', '2026-11-20'), r('future', '2026-12-03'), r('b', today)];
    expect(pendingReminders(all, undefined, today).map((x) => x.key)).toEqual(['a', 'b']);
    const log: ReminderLog = { id: 'log', sent: [{ key: 'a', date: '2026-11-30' }] };
    expect(pendingReminders(all, log, today).map((x) => x.key)).toEqual(['b']);
  });

  it('records what was sent and forgets what can no longer be due', () => {
    const log: ReminderLog = { id: 'log', sent: [{ key: 'ancient', date: '2026-10-01' }, { key: 'a', date: '2026-11-30' }] };
    const next = recordSent(log, [r('b', today)], today);
    expect(next.sent.map((s) => s.key)).toEqual(['a', 'b']);
    expect(pendingReminders([r('a', '2026-11-30'), r('b', today)], next, today)).toEqual([]);
  });
});
