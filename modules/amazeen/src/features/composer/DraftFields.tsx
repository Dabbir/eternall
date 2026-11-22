import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { LIMITS } from '../../domain/entries';
import type { DraftErrors } from '../../domain/entries';
import { countWords, readingMinutes } from '../../domain/text';
import type { EntryDraft } from '../../domain/types';
import { useAutosize } from '../../state/hooks';
import { useMentions } from '../../imprint/MentionField';
import styles from './Composer.module.css';

interface FieldsProps {
  draft: EntryDraft;
  errors: DraftErrors;
  onChange: (draft: EntryDraft) => void;
  autoFocus: boolean;
}

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useAutosize(props.value);
  return <textarea ref={ref} rows={1} {...props} />;
}

/** A body field that also offers "@" mentions from KINDRED when the host provides them. */
function MentionTextarea({ onValue, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; onValue: (v: string) => void }) {
  const ref = useAutosize(props.value);
  const { fieldProps, popup } = useMentions(ref, props.value, onValue, props.maxLength);
  return (
    <>
      <textarea ref={ref} rows={1} {...props} {...fieldProps} onChange={(e) => onValue(e.target.value)} />
      {popup}
    </>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className={ui.error} role="alert">
      {message}
    </p>
  );
}

/** The writing surface for each kind of piece. Purely presentational; state lives in the Composer. */
export function DraftFields({ draft, errors, onChange, autoFocus }: FieldsProps) {
  const ids = { title: useId(), body: useId(), attribution: useId(), items: useId() };
  const errId = (k: keyof typeof ids) => `${ids[k]}-error`;
  const aria = (k: keyof DraftErrors) =>
    errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': errId(k) } : {};

  switch (draft.kind) {
    case 'story': {
      const words = countWords(draft.body);
      return (
        <>
          <label className="visually-hidden" htmlFor={ids.title}>
            Headline
          </label>
          <AutoTextarea
            id={ids.title}
            className={styles.titleField}
            value={draft.title}
            placeholder="Headline"
            maxLength={LIMITS.title + 20}
            autoFocus={autoFocus}
            onChange={(e) => onChange({ ...draft, title: e.target.value.replace(/\n/gu, ' ') })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                document.getElementById(ids.body)?.focus();
              }
            }}
            {...aria('title')}
          />
          <FieldError id={errId('title')} message={errors.title} />
          <label className="visually-hidden" htmlFor={ids.body}>
            Story
          </label>
          <MentionTextarea
            id={ids.body}
            className={styles.bodyField}
            value={draft.body}
            placeholder="Start with the moment it began. Leave a blank line between paragraphs."
            onValue={(body) => onChange({ ...draft, body })}
            {...aria('body')}
          />
          <FieldError id={errId('body')} message={errors.body} />
          <p className={styles.counter}>
            {words.toLocaleString()} {words === 1 ? 'word' : 'words'} · {readingMinutes(words) || '<1'} min read
            {words > 0 && words < 150 && <span className={styles.counterHint}> · {150 - words} more for a cover-worthy feature</span>}
          </p>
        </>
      );
    }

    case 'note':
      return (
        <>
          <label className="visually-hidden" htmlFor={ids.body}>
            Note
          </label>
          <MentionTextarea
            id={ids.body}
            className={styles.noteField}
            value={draft.body}
            placeholder="What happened today?"
            autoFocus={autoFocus}
            onValue={(body) => onChange({ ...draft, body })}
            {...aria('body')}
          />
          <FieldError id={errId('body')} message={errors.body} />
          <p className={styles.counter} data-over={draft.body.length > 1000 || undefined}>
            {draft.body.length} / 1,000
          </p>
        </>
      );

    case 'quote':
      return (
        <div className={styles.quoteWrap}>
          <span className={styles.quoteMark} aria-hidden="true">
            “
          </span>
          <label className="visually-hidden" htmlFor={ids.body}>
            Quote
          </label>
          <AutoTextarea
            id={ids.body}
            className={styles.quoteField}
            value={draft.body}
            placeholder="Something someone said…"
            maxLength={460}
            autoFocus={autoFocus}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            {...aria('body')}
          />
          <FieldError id={errId('body')} message={errors.body} />
          <div className={styles.attribution}>
            <span aria-hidden="true">—</span>
            <label className="visually-hidden" htmlFor={ids.attribution}>
              Who said it?
            </label>
            <input
              id={ids.attribution}
              className={styles.attributionField}
              value={draft.attribution}
              placeholder="Who said it? (optional)"
              maxLength={LIMITS.attribution + 10}
              onChange={(e) => onChange({ ...draft, attribution: e.target.value })}
              {...aria('attribution')}
            />
          </div>
          <FieldError id={errId('attribution')} message={errors.attribution} />
        </div>
      );

    case 'list':
      return <ListFields draft={draft} errors={errors} onChange={onChange} autoFocus={autoFocus} ids={ids} />;
  }
}

function ListFields({
  draft,
  errors,
  onChange,
  autoFocus,
  ids,
}: {
  draft: Extract<EntryDraft, { kind: 'list' }>;
  errors: DraftErrors;
  onChange: (d: EntryDraft) => void;
  autoFocus: boolean;
  ids: { title: string; items: string };
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const focusItem = (index: number): void => {
    window.requestAnimationFrame(() => listRef.current?.querySelectorAll('input')[index]?.focus());
  };
  const setItem = (index: number, value: string): void =>
    onChange({ ...draft, items: draft.items.map((it, i) => (i === index ? value : it)) });
  const addItem = (after: number): void => {
    if (draft.items.length >= LIMITS.listItems) return;
    const items = [...draft.items];
    items.splice(after + 1, 0, '');
    onChange({ ...draft, items });
    focusItem(after + 1);
  };
  const removeItem = (index: number): void => {
    if (draft.items.length <= 1) return;
    onChange({ ...draft, items: draft.items.filter((_, i) => i !== index) });
    focusItem(Math.max(0, index - 1));
  };
  const onItemKey = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      addItem(index);
    } else if (e.key === 'Backspace' && draft.items[index] === '' && draft.items.length > 1) {
      e.preventDefault();
      removeItem(index);
    }
  };

  return (
    <>
      <label className="visually-hidden" htmlFor={ids.title}>
        List title
      </label>
      <AutoTextarea
        id={ids.title}
        className={styles.titleField}
        value={draft.title}
        placeholder="Name the list"
        maxLength={LIMITS.title + 20}
        autoFocus={autoFocus}
        onChange={(e) => onChange({ ...draft, title: e.target.value.replace(/\n/gu, ' ') })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            focusItem(0);
          }
        }}
        {...(errors.title ? { 'aria-invalid': true, 'aria-describedby': `${ids.title}-error` } : {})}
      />
      <FieldError id={`${ids.title}-error`} message={errors.title} />

      <ol ref={listRef} className={styles.items} aria-label="Items" aria-describedby={errors.items ? `${ids.items}-error` : undefined}>
        {draft.items.map((item, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.itemNum} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              className={styles.itemField}
              value={item}
              placeholder={i === 0 ? 'First thing…' : 'Next…'}
              maxLength={LIMITS.listItem + 10}
              aria-label={`Item ${i + 1}`}
              aria-invalid={errors.items && i === 0 ? true : undefined}
              onChange={(e) => setItem(i, e.target.value)}
              onKeyDown={onItemKey(i)}
            />
            <button
              type="button"
              className={ui.iconBtn}
              aria-label={`Remove item ${i + 1}`}
              onClick={() => removeItem(i)}
              disabled={draft.items.length <= 1}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ol>
      <FieldError id={`${ids.items}-error`} message={errors.items} />
      {draft.items.length < LIMITS.listItems && (
        <button type="button" className={`${ui.btn} ${ui.quiet} ${ui.small} ${styles.addItem}`} onClick={() => addItem(draft.items.length - 1)}>
          <Icon name="plus" size={16} /> Add item
        </button>
      )}
    </>
  );
}
