import { Icon, WeatherIcon } from '../../components/Icon';
import ui from '../../components/ui.module.css';
import { KIND_INFO, MOOD_INFO, SECTION_INFO } from '../../domain/catalog';
import { formatTime } from '../../domain/dates';
import { entryWords, truncate } from '../../domain/text';
import type { Entry } from '../../domain/types';
import { Link, paths } from '../../router/router';
import styles from './Desk.module.css';

export function entryHeadline(entry: Entry): string {
  switch (entry.kind) {
    case 'story':
    case 'list':
      return entry.title;
    case 'note':
      return truncate(entry.body, 140);
    case 'quote':
      return `“${truncate(entry.body, 120)}”`;
  }
}

function entrySubline(entry: Entry): string {
  switch (entry.kind) {
    case 'story':
      return `${entryWords(entry).toLocaleString()} words`;
    case 'list':
      return `${entry.items.length} items`;
    case 'quote':
      return entry.attribution ? `— ${entry.attribution}` : 'Anonymous';
    case 'note':
      return '';
  }
}

interface EntryRowProps {
  entry: Entry;
  isCover: boolean;
  onToggleStar: () => void;
  onDelete: () => void;
}

export function EntryRow({ entry, isCover, onToggleStar, onDelete }: EntryRowProps) {
  const sub = entrySubline(entry);
  const headline = entryHeadline(entry);

  return (
    <li className={styles.row} data-kind={entry.kind}>
      <span className={styles.rowTime}>{formatTime(new Date(entry.createdAt))}</span>
      <Link to={paths.edit(entry.id)} className={styles.rowMain}>
        <span className={styles.rowKind}>
          {KIND_INFO[entry.kind].label}
          {isCover && <span className={styles.coverTag}>Cover</span>}
        </span>
        <span className={styles.rowTitle}>{headline}</span>
        <span className={styles.rowSub}>
          {SECTION_INFO[entry.section].label}
          {sub && ` · ${sub}`}
        </span>
      </Link>
      <span className={styles.rowWeather} title={MOOD_INFO[entry.mood].label}>
        <WeatherIcon mood={entry.mood} size={20} />
        <span className="visually-hidden">Mood: {MOOD_INFO[entry.mood].label}</span>
      </span>
      <span className={styles.rowActions}>
        <button
          type="button"
          className={ui.iconBtn}
          aria-pressed={entry.starred}
          aria-label={entry.starred ? `Unstar “${truncate(headline, 40)}”` : `Star “${truncate(headline, 40)}” for the cover`}
          title={entry.starred ? 'Starred for the cover' : 'Star for the cover'}
          onClick={onToggleStar}
        >
          <Icon name="star" filled={entry.starred} />
        </button>
        <Link to={paths.edit(entry.id)} className={ui.iconBtn} aria-label={`Edit “${truncate(headline, 40)}”`} title="Edit">
          <Icon name="edit" />
        </Link>
        <button
          type="button"
          className={ui.iconBtn}
          aria-label={`Delete “${truncate(headline, 40)}”`}
          title="Delete"
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}
