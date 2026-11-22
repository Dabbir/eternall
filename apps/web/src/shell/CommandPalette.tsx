import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMedium, locateIndex, type ImprintDefinition, type Memory, type ReadContext } from '@eternall/core';
import { Dialog, Icon, type IconName } from '@eternall/ui';
import { INSCRIPTION_PATH, type Inscription } from '../house/domain/house';
import { useSettings } from './hooks';
import { navigate } from './router';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  group: 'Actions' | 'Go to' | 'Memories' | 'Jump';
  run: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function houseMemories(ctx: ReadContext): Memory[] {
  return ctx.data
    .collection<Inscription>(INSCRIPTION_PATH)
    .all()
    .map((i) => ({ imprint: 'house' as const, id: i.id, date: i.date, title: i.title, excerpt: i.body, tone: i.tone, href: `/inscriptions?open=${i.id}` }));
}

export function CommandPalette({ open, onClose, ctx, enabled }: { open: boolean; onClose(): void; ctx: ReadContext; enabled: readonly ImprintDefinition[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [settings, updateSettings] = useSettings();

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.hasAttribute('data-theme') && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const base: Command[] = [
      { id: 'inscribe', label: 'Inscribe today', hint: 'A quick memory', icon: 'pen', group: 'Actions', run: () => navigate('/inscriptions?new=1') },
      {
        id: 'theme',
        label: isDark ? 'Switch to paper (light)' : 'Switch to night (dark)',
        icon: isDark ? 'sun' : 'moon',
        group: 'Actions',
        run: () => updateSettings({ theme: isDark ? 'light' : 'dark' }),
      },
      { id: 'go-house', label: 'Your lifeline', hint: 'ETERNALL', icon: 'grid', group: 'Go to', run: () => navigate('/') },
      ...enabled.map<Command>((d) => ({ id: `go-${d.id}`, label: `${d.name} · ${d.functionLine}`, icon: 'arrow', group: 'Go to', run: () => navigate(d.basePath) })),
      { id: 'go-inscriptions', label: 'Inscriptions', icon: 'book', group: 'Go to', run: () => navigate('/inscriptions') },
      { id: 'go-settings', label: 'Settings', icon: 'settings', group: 'Go to', run: () => navigate('/settings') },
    ];
    const q = query.trim();
    const out: Command[] = [];
    if (DATE_RE.test(q) && ctx.profile) {
      const idx = locateIndex(ctx.profile.birthDate, q);
      if (idx !== null && idx < ctx.profile.horizonYears * 52) {
        out.push({ id: 'jump', label: `Jump to the week of ${formatMedium(q)}`, icon: 'today', group: 'Jump', run: () => navigate(`/?week=${idx}`) });
      }
    }
    const lower = q.toLowerCase();
    out.push(...base.filter((c) => !q || c.label.toLowerCase().includes(lower) || c.hint?.toLowerCase().includes(lower)));
    if (q.length >= 2) {
      const terms = lower.split(/\s+/).filter(Boolean);
      const all = [...houseMemories(ctx), ...enabled.flatMap((d) => d.memories?.(ctx) ?? [])];
      const hits = all
        .filter((m) => terms.every((t) => `${m.title}\n${m.excerpt ?? ''}`.toLowerCase().includes(t)))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8);
      out.push(...hits.map<Command>((m) => ({ id: `m-${m.imprint}-${m.id}`, label: m.title, hint: formatMedium(m.date), icon: 'book', group: 'Memories', run: () => navigate(m.href) })));
    }
    return out;
    // settings is read for the theme label only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ctx, enabled, settings.theme]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    window.setTimeout(c.run, 0);
  };

  let lastGroup = '';
  return (
    <Dialog open={open} onClose={onClose} title="Search and jump" hideTitle className="palette">
      <div className="palette__search">
        <Icon name="search" size={18} />
        <input
          className="palette__input"
          placeholder="Type a command, a memory, or a date (YYYY-MM-DD)…"
          value={query}
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
          aria-label="Search commands and memories"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(commands.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(commands[active]);
            }
          }}
        />
      </div>
      <ul className="palette__list" id="palette-list" role="listbox" ref={listRef} aria-label="Results">
        {commands.length === 0 && <li className="palette__empty muted">Nothing found for “{query}”.</li>}
        {commands.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          return (
            <li key={c.id} role="presentation">
              {header && (
                <p className="palette__group eyebrow" role="presentation">
                  {header}
                </p>
              )}
              <div
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                className={`palette__item ${i === active ? 'is-active' : ''}`}
                onMouseMove={() => setActive(i)}
                onClick={() => run(c)}
              >
                <Icon name={c.icon} size={18} />
                <span className="palette__label">{c.label}</span>
                {c.hint && <span className="palette__hint mono">{c.hint}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="palette__foot mono faint">↑↓ to move · ↵ to choose · esc to close</p>
    </Dialog>
  );
}
