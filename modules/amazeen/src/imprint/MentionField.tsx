import { createContext, useContext, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { applyMention, mentionQuery } from './mentions';
import styles from './MentionField.module.css';

/** The people on AMAZEEN's wall, for "@" mentions (once KINDRED's `people.mention`; docs/adr/0014). */
export interface PeopleMention {
  search(query: string): { id: string; name: string }[];
  nameOf(id: string): string | null;
  href(id: string): string;
}
/** Set inside ETERNALL from AMAZEEN · People; null when AMAZEEN runs on its own. */
export const MentionContext = createContext<PeopleMention | null>(null);

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
 * Type "@" and a few letters to pick someone from your People wall. Arrow keys move, Enter or Tab picks,
 * Escape closes. Without anyone on the wall this does nothing and "@" is just a character.
 */
export function useMentions(ref: RefObject<HTMLTextAreaElement | null>, value: string, onValue: (v: string) => void, max?: number): Bound {
  const people = useContext(MentionContext);
  const id = useId();
  const [q, setQ] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  // Where the popup sits: just under the caret's line, not under a tall field's bottom edge.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(4);
  const matches = people && q && q.query ? people.search(q.query).slice(0, 5) : [];
  const open = matches.length > 0 && q !== null && closedAt !== q.start;

  const read = () => {
    const el = ref.current;
    if (!people || !el) return;
    const next = mentionQuery(el.value, el.selectionStart ?? el.value.length);
    setQ((prev) => (prev?.start === next?.start && prev?.query === next?.query ? prev : next));
    if (!next || next.start !== q?.start || next.query !== q?.query) setActive(0);
    if (!next) setClosedAt(null);
    if (next && wrapRef.current) setTop(caretBottom(el) - (wrapRef.current.offsetTop - el.offsetTop) + 4);
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
      <div ref={wrapRef} className={styles.wrap}>
        {open && (
          <div className={styles.list} style={{ top }}>
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

/** The caret line's bottom edge, in px from the textarea's top (a hidden mirror with the same text metrics). */
function caretBottom(el: HTMLTextAreaElement): number {
  const cs = getComputedStyle(el);
  const mirror = document.createElement('div');
  for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'textIndent', 'wordSpacing', 'fontVariationSettings', 'fontFeatureSettings'] as const) {
    mirror.style[k] = cs[k];
  }
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', width: `${el.offsetWidth}px`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
  mirror.textContent = el.value.slice(0, el.selectionStart ?? el.value.length);
  const mark = document.createElement('span');
  mark.textContent = '\u200b';
  mirror.append(mark);
  document.body.append(mirror);
  const line = Number.parseFloat(cs.lineHeight) || mark.offsetHeight;
  const bottom = mark.offsetTop + line - el.scrollTop;
  mirror.remove();
  return Math.min(bottom, el.offsetHeight);
}
