import { linkProps } from '../shell/router';

export type LifeSection = 'weeks' | 'chapters' | 'inscriptions' | 'almanac';

const TABS: { id: LifeSection; label: string; href: string }[] = [
  { id: 'weeks', label: 'Weeks', href: '/life' },
  { id: 'chapters', label: 'Chapters', href: '/chapters' },
  { id: 'inscriptions', label: 'Inscriptions', href: '/inscriptions' },
  { id: 'almanac', label: 'Almanac', href: '/almanac' },
];

/** "Your life in weeks" (docs/adr/0014): the lifeline with its sections, one optional page of the house. */
export function LifeTabs({ here }: { here: LifeSection }) {
  return (
    <nav className="life-tabs" aria-label="Your life in weeks">
      <span className="life-tabs__title">Your life in weeks</span>
      <ul>
        {TABS.map((t) => (
          <li key={t.id}>
            <a className="life-tabs__tab" {...linkProps(t.href)} aria-current={here === t.id ? 'page' : undefined}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
