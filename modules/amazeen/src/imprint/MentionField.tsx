import { createContext, useContext, useId, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { Capabilities } from '@eternall/kit';
import { applyMention, mentionQuery } from './mentions';
import styles from './MentionField.module.css';

/** KINDRED's `people.mention`, set by the host when KINDRED is on; null everywhere else. */
export const MentionContext = createContext<Capabilities['people.mention'] | null>(null);

interface Bound {
  /** Spread onto the textarea. */
  fieldProps: {
    onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void;
    onSelect(): void;
    onBlur(): void;
    'aria-autocomplete'?: 'list';
    'aria-controls'?: string;
    'aria-expanded'?: boolean;
    'aria-activedescendant'?: string;
  };
  /** Render right after the textarea. */
  popup: ReactNode;
}

/**
 * Type "@" and a few letters to pick someone from KINDRED. Arrow keys move, Enter or Tab picks,
 * Escape closes. Without KINDRED this does nothing and "@" is just a character.
 */
export function useMentions(ref: RefObject<HTMLTextAreaElement | null>, value: string, onValue: (v: string) => void, max?: number): Bound {
  const people = useContext(MentionContext);
  const id = useId();
  const [q, setQ] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const matches = people && q && q.query ? people.search(q.query).slice(0, 5) : [];
  const open = matches.length > 0 && q !== null && closedAt !== q.start;

  const read = () => {
    const el = ref.current;
    if (!people || !el) return;
    const next = mentionQuery(el.value, el.selectionStart ?? el.value.length);
    setQ((prev) => (prev?.start === next?.start && prev?.query === next?.query ? prev : next));
    if (!next || next.start !== q?.start || next.query !== q?.query) setActive(0);
    if (!next) setClosedAt(null);
  };
  const pick = (name: string) => {
    const el = ref.current;
    if (!el || !q) return;
    const r = applyMention(value, q.start, el.selectionStart ?? value.length, name, max);
    onValue(r.text);
    setQ(null);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.caret, r.caret);
    });
  };

  if (!people) return { fieldProps: { onKeyDown: () => undefined, onSelect: () => undefined, onBlur: () => undefined }, popup: null };

  const optionId = (i: number) => `${id}-opt-${i}`;
  return {
    fieldProps: {
      onKeyDown: (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
        } else if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          pick(matches[active]?.name ?? matches[0]!.name);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setClosedAt(q.start);
        }
      },
      onSelect: read,
      onBlur: () => window.setTimeout(() => setQ(null), 150),
      'aria-autocomplete': 'list',
      'aria-controls': `${id}-list`,
      'aria-expanded': open,
      ...(open ? { 'aria-activedescendant': optionId(active) } : {}),
    },
    popup: (
      <div className={styles.wrap}>
        {open && (
          <div className={styles.list}>
          <div id={`${id}-list`} role="listbox" aria-label="People from KINDRED">
            {matches.map((p, i) => (
              <div
                key={p.id}
                id={optionId(i)}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                className={styles.option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p.name);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className={styles.at} aria-hidden="true">@</span>
                {p.name}
              </div>
            ))}
          </div>
          <p className={styles.hint} aria-hidden="true">
            From KINDRED · Enter to pick · Esc to close
          </p>
          </div>
        )}
      </div>
    ),
  };
}
