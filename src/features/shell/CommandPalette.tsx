import { useEffect, useMemo, useRef, useState } from 'react';
import { locateIndex } from '../../domain/time';
import { searchInscriptions } from '../../domain/stats';
import { formatMedium } from '../../lib/format';
import { navigate, type RouteName } from '../../lib/router';
import { useProfileStore } from '../../store/StoreProvider';
import { Dialog } from '../../components/ui/Dialog';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useEditors } from '../editors/EditorsProvider';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  group: 'Actions' | 'Go to' | 'Memories' | 'Jump';
  run: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, data, today, dispatch } = useProfileStore();
  const editors = useEditors();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (name: RouteName, label: string, icon: IconName): Command => ({ id: `go-${name}`, label, icon, group: 'Go to', run: () => navigate(name) });
    const base: Command[] = [
      { id: 'inscribe', label: 'Inscribe today', hint: 'New memory', icon: 'pen', group: 'Actions', run: () => editors.inscribe({ date: today }) },
      { id: 'capsule', label: 'Seal a letter to your future', hint: 'New capsule', icon: 'seal', group: 'Actions', run: () => editors.composeCapsule() },
      { id: 'chapter', label: 'Name a chapter', icon: 'chapters', group: 'Actions', run: () => editors.editChapter() },
      {
        id: 'theme',
        label: 'Switch between paper and night',
        icon: document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon',
        group: 'Actions',
        run: () => {
          const dark =
            document.documentElement.getAttribute('data-theme') === 'dark' ||
            (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
          dispatch({ type: 'settings/update', patch: { theme: dark ? 'light' : 'dark' } });
        },
      },
      go('lifeline', 'Lifeline', 'grid'),
      go('archive', 'Archive', 'book'),
      go('capsules', 'Capsules', 'seal'),
      go('chapters', 'Chapters', 'chapters'),
      go('almanac', 'Almanac', 'almanac'),
      go('settings', 'Settings', 'settings'),
    ];
    const q = query.trim();
    const out: Command[] = [];
    if (DATE_RE.test(q)) {
      const idx = locateIndex(profile.birthDate, q);
      if (idx !== null && idx < profile.horizonYears * 52) {
        out.push({ id: 'jump', label: `Jump to the week of ${formatMedium(q)}`, icon: 'today', group: 'Jump', run: () => navigate('lifeline', { week: idx }) });
      }
    }
    const lower = q.toLowerCase();
    out.push(...base.filter((c) => !q || c.label.toLowerCase().includes(lower) || c.hint?.toLowerCase().includes(lower)));
    if (q.length >= 2) {
      const hits = searchInscriptions(data.inscriptions, q)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6);
      out.push(
        ...hits.map<Command>((ins) => ({
          id: `ins-${ins.id}`,
          label: ins.title,
          hint: formatMedium(ins.date),
          icon: 'book',
          group: 'Memories',
          run: () => editors.inscribe({ existing: ins }),
        })),
      );
    }
    return out;
  }, [query, data.inscriptions, editors, today, profile, dispatch]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    // Let the palette close before opening another dialog.
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
              {header && <p className="palette__group eyebrow" role="presentation">{header}</p>}
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
