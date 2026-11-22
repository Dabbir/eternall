import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '../../components/Toast';
import { createEntry, hasErrors, validateDraft } from '../../domain/entries';
import type { Entry } from '../../domain/types';
import { useStore } from '../../state/store';
import styles from './Desk.module.css';

/** Same-day mood carries over: if you've already called it a sunny day, it probably still is. */
function todaysMood(entries: readonly Entry[]): Entry['mood'] {
  const today = new Date().toDateString();
  return entries.toReversed().find((e) => new Date(e.createdAt).toDateString() === today)?.mood ?? 3;
}

/**
 * The fastest way into the issue: type a line, press Enter, and it's filed as a note.
 * Longer pieces still go through the full composer.
 */
export function QuickJot() {
  const store = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const file = (e: FormEvent): void => {
    e.preventDefault();
    const draft = { kind: 'note' as const, body: text };
    const errors = validateDraft(draft);
    if (hasErrors(errors)) {
      setError(errors.body ?? 'Write a line or two before filing.');
      return;
    }
    const entry = createEntry(draft, { section: 'life', mood: todaysMood(store.data.entries), starred: false });
    store.addEntry(entry);
    setText('');
    setError(null);
    toast.push({
      message: `Filed to No. ${store.current.number}.`,
      action: { label: 'Undo', onAction: () => store.deleteEntry(entry.id) },
    });
  };

  return (
    <form className={styles.jot} onSubmit={file} noValidate>
      <label htmlFor={id} className={styles.jotLabel}>
        Jot a note for No. {store.current.number}
      </label>
      <div className={styles.jotRow}>
        <input
          id={id}
          className={styles.jotInput}
          value={text}
          maxLength={1000}
          placeholder="What happened today?"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
        />
        <button type="submit" className={styles.jotSubmit} aria-label="File note">
          <span aria-hidden="true">↵</span>
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.jotError} role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className={styles.jotHint}>
          Press Enter to file. It lands in Dispatches.
        </p>
      )}
    </form>
  );
}
