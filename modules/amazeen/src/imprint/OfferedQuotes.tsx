import { useState } from 'react';
import { useHouse } from '@eternall/kit';
import { createEntry, LIMITS } from '../domain/entries';
import { useStore } from '../state/store';
import styles from './OfferedQuotes.module.css';

/**
 * Underlines MARGINALIA offers for the "Overheard" page (quotes.offer, docs/ARCHITECTURE.md §5).
 * Nothing is added without a press; each offer is shown once, whether taken or set aside.
 * Without MARGINALIA this renders nothing.
 */
export function OfferedQuotes() {
  const house = useHouse();
  const { addEntry } = useStore();
  const [open, setOpen] = useState(false);
  const offers = house.capability('quotes.offer');
  const pending = (offers?.offered() ?? []).filter((q) => !house.isDismissed(`amazeen.quote.${q.id}`));
  if (!pending.length) return null;
  const take = (q: (typeof pending)[number]) => {
    const attribution = [q.by, q.workTitle].filter(Boolean).join(', ').slice(0, LIMITS.attribution);
    addEntry(createEntry({ kind: 'quote', body: q.text.slice(0, LIMITS.body), attribution }, { section: 'culture', mood: 3, starred: false }));
    house.dismiss(`amazeen.quote.${q.id}`);
    house.toast({ message: 'Added to this issue’s Overheard page.', tone: 'accent' });
  };
  return (
    <aside className={styles.offers} aria-label="Quotes offered from MARGINALIA">
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.count}>{pending.length}</span> {pending.length === 1 ? 'underline' : 'underlines'} offered from MARGINALIA for Overheard
      </button>
      {open && (
        <ul className={styles.list}>
          {pending.map((q) => (
            <li key={q.id} className={styles.item}>
              <blockquote className={styles.quote}>“{q.text.length > 220 ? `${q.text.slice(0, 219)}…` : q.text}”</blockquote>
              <p className={styles.src}>
                {q.by && `${q.by}, `}
                <em>{q.workTitle}</em>
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.add} onClick={() => take(q)}>
                  Add to this issue
                </button>
                <button type="button" className={styles.skip} onClick={() => house.dismiss(`amazeen.quote.${q.id}`)}>
                  Not this one
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
