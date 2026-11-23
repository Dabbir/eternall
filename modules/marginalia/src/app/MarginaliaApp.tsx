import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-400-italic.css';
import '@fontsource/literata/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/caveat/latin-400.css';
import '../theme/marginalia.css';
import '../theme/marginalia.kit.css';
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatMedium, formatMonthYear, plural, type ImprintAppProps } from '@eternall/core';
import { useHouse, usePrimaryAction } from '@eternall/kit';
import { Chrome } from './Chrome';
import { Button, Icon, Segmented } from '@eternall/ui';
import { DimensionToggle } from '@eternall/stage';
import { useCollection } from '@eternall/vault';
import { KIND_LABEL, PREF_PATH, UNDERLINE_PATH, WORK_PATH, type Prefs, authorHeading, catalogue, dayOf, currentlyReading, landingLabel, underlinesOf, yearOf, type SortBy, type Underline, type Work } from '../works';
import { UnderlineEditor, WorkEditor } from './Editors';

const SORTS = [
  { value: 'author', label: 'Author' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
  { value: 'kind', label: 'Kind' },
] as const;

export default function MarginaliaApp({ path, search }: ImprintAppProps) {
  const { items: works } = useCollection<Work>(WORK_PATH);
  const [editing, setEditing] = useState<null | { kind: 'work'; existing?: Work } | { kind: 'underline'; work: Work; existing?: Underline }>(search.get('new') ? { kind: 'work' } : null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const m = /^\/work\/([A-Za-z0-9_-]+)$/.exec(path);
  const open = m ? works.find((w) => w.id === m[1]) : undefined;
  usePrimaryAction(open ? { label: 'Add an underline', run: () => setEditing({ kind: 'underline', work: open }) } : { label: 'Add a work', run: () => setEditing({ kind: 'work' }) });
  return (
    <Chrome here={m ? 'work' : path === '/underlines' ? 'underlines' : 'catalogue'}>
    <div className="mg">
      {open ? (
        <WorkPage work={open} justAdded={justAdded} onEdit={() => setEditing({ kind: 'work', existing: open })} onUnderline={(u) => setEditing({ kind: 'underline', work: open, ...(u ? { existing: u } : {}) })} />
      ) : path === '/underlines' ? (
        <AllUnderlines search={search} />
      ) : (
        <Catalogue onNew={() => setEditing({ kind: 'work' })} />
      )}
      {editing?.kind === 'work' && <WorkEditor key={editing.existing?.id ?? 'new'} existing={editing.existing} onClose={() => setEditing(null)} />}
      {editing?.kind === 'underline' && <UnderlineEditor key={editing.existing?.id ?? 'new'} work={editing.work} existing={editing.existing} onSaved={setJustAdded} onClose={() => setEditing(null)} />}
    </div>
    </Chrome>
  );
}

function Head({ children }: { children?: ReactNode }) {
  return (
    <header className="mg-head">
      <div>
        <h1 className="mg-title">
          Everything you underlined, <em>kept.</em>
        </h1>
      </div>
      {children}
    </header>
  );
}

function Catalogue({ onNew }: { onNew(): void }) {
  const house = useHouse();
  const { items: works } = useCollection<Work>(WORK_PATH);
  const { items: lines } = useCollection<Underline>(UNDERLINE_PATH);
  const [sort, setSort] = useState<SortBy>('author');
  const [dimension, setDimension] = useState<'2d' | '3d'>('2d');
  const view = house.immersive.allowed ? dimension : '2d';
  const [pulling, setPulling] = useState<string | null>(null);
  const drawers = useMemo(() => catalogue(works, sort), [works, sort]);
  const reading = currentlyReading(works)[0];
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const u of lines) c.set(u.workId, (c.get(u.workId) ?? 0) + 1);
    return c;
  }, [lines]);
  const open = (id: string) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return house.navigate(house.href(`/work/${id}`));
    setPulling(id);
    window.setTimeout(() => house.navigate(house.href(`/work/${id}`)), 420);
  };

  if (!works.length) {
    return (
      <>
        <Head />
        <div className="mg-empty">
          <div className="mg-drawer mg-drawer--empty" aria-hidden="true">
            <div className="mg-card mg-card--blank">
              <span className="mg-card__rule" />
            </div>
          </div>
          <p className="mg-empty__text">What are you reading, watching or listening to? Add a work and keep the lines that stay with you.</p>
          <Button variant="primary" icon="plus" onClick={onNew}>
            Add a work
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <div className="mg-head__tools">
          <Segmented label="Sort the catalogue by" options={SORTS} value={sort} onChange={(v) => setSort(v as SortBy)} />
          <DimensionToggle value={view} onChange={setDimension} allowed={house.immersive.allowed} reason={house.immersive.reason} label3d="Cabinet" />
        </div>
      </Head>
      {reading && (
        <p className="mg-reading">
          <span className="mg-reading__label">Currently reading</span>
          <button type="button" className="mg-link" onClick={() => open(reading.id)}>
            {reading.title}
          </button>
          {reading.by && <span> — {reading.by}</span>}
          <span className="mg-reading__meta"> · {plural(counts.get(reading.id) ?? 0, 'underline')}</span>
        </p>
      )}
      {view === '3d' ? (
        <Cabinet drawers={drawers} counts={counts} onOpen={open} />
      ) : (
        <div className="mg-drawers">
          {drawers.map((d) => (
            <section key={d.label} className="mg-drawer" aria-label={`Drawer ${d.label}, ${plural(d.works.length, 'card')}`}>
              <h2 className="mg-drawer__label">{d.label}</h2>
              <ul className="mg-drawer__cards">
                {d.works.map((w) => (
                  <li key={w.id}>
                    <button type="button" className={`mg-card ${pulling === w.id ? 'is-pulled' : ''}`} onClick={() => open(w.id)}>
                      <span className="mg-card__rule" aria-hidden="true" />
                      <span className="mg-card__head">{sort === 'title' ? w.title : authorHeading(w.by) || w.title}</span>
                      <span className="mg-card__title">{sort === 'title' ? w.by : w.title}</span>
                      <span className="mg-card__meta">
                        {KIND_LABEL[w.kind]}
                        {yearOf(w) ? ` · ${yearOf(w)}` : ''}
                        {counts.get(w.id) ? ` · ${plural(counts.get(w.id)!, 'underline')}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mg-footer">
        <button type="button" className="mg-link" onClick={() => house.navigate(house.href('/underlines'))}>
          Every underline, by year →
        </button>
      </p>
    </>
  );
}

/**
 * The catalogue cabinet (immersive, CSS 3D: sharper for text than WebGL). Drawers pull out with depth;
 * cards tilt forward as you browse with arrows; the chosen card lifts and opens. A tree for assistive tech.
 */
function Cabinet({ drawers, counts, onOpen }: { drawers: ReturnType<typeof catalogue>; counts: Map<string, number>; onOpen(id: string): void }) {
  const [openDrawer, setOpenDrawer] = useState(0);
  const [card, setCard] = useState(0);
  const tree = useRef<HTMLDivElement>(null);
  const current = drawers[openDrawer];
  const focusItem = () => window.requestAnimationFrame(() => tree.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus());
  const onKey = (e: KeyboardEvent) => {
    if (!current) return;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setCard((c) => Math.min(current.works.length - 1, c + 1)),
      ArrowUp: () => setCard((c) => Math.max(0, c - 1)),
      ArrowRight: () => { setOpenDrawer((d) => Math.min(drawers.length - 1, d + 1)); setCard(0); },
      ArrowLeft: () => { setOpenDrawer((d) => Math.max(0, d - 1)); setCard(0); },
      Enter: () => current.works[card] && onOpen(current.works[card]!.id),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]!();
      focusItem();
    }
  };
  return (
    <div className="mg-cabinet" ref={tree} role="tree" aria-label="Catalogue cabinet: arrow keys move between drawers and cards, Enter opens" onKeyDown={onKey}
      onWheel={(e) => {
        // Riffle with a sideways swipe (or Shift + wheel); a plain wheel scrolls the page (DESIGN §1.3).
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        if (!current || Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
        setCard((c) => Math.max(0, Math.min(current.works.length - 1, c + Math.sign(dx))));
      }}>
      <div className="mg-cabinet__body">
        {drawers.map((d, di) => {
          const isOpen = di === openDrawer;
          return (
            <div key={d.label} role="treeitem" aria-expanded={isOpen} aria-selected={false} aria-label={`Drawer ${d.label}`} className={`mg-cab-drawer ${isOpen ? 'is-open' : ''}`} tabIndex={-1}>
              <button type="button" className="mg-cab-drawer__front" tabIndex={-1} onClick={() => { setOpenDrawer(di); setCard(0); focusItem(); }}>
                <span className="mg-cab-drawer__label">{d.label}</span>
                <span className="mg-cab-drawer__pull" aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="mg-cab-drawer__tray" role="group">
                  {d.works.map((w, i) => (
                    <div
                      key={w.id}
                      role="treeitem"
                      aria-selected={i === card}
                      tabIndex={i === card ? 0 : -1}
                      className={`mg-cab-card ${i === card ? 'is-up' : i < card ? 'is-past' : ''}`}
                      style={{ ['--k' as string]: i - card }}
                      onClick={() => (i === card ? onOpen(w.id) : setCard(i))}
                    >
                      <span className="mg-card__rule" aria-hidden="true" />
                      <span className="mg-card__head">{authorHeading(w.by) || w.title}</span>
                      <span className="mg-card__title">{w.title}</span>
                      <span className="mg-card__meta">
                        {KIND_LABEL[w.kind]}
                        {yearOf(w) ? ` · ${yearOf(w)}` : ''}
                        {counts.get(w.id) ? ` · ${plural(counts.get(w.id)!, 'underline')}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mg-cabinet__hint" aria-hidden="true">← → drawers · ↑ ↓ or swipe sideways through cards · Enter or click the raised card to open</p>
    </div>
  );
}

function WorkPage({ work, justAdded, onEdit, onUnderline }: { work: Work; justAdded: string | null; onEdit(): void; onUnderline(u?: Underline): void }) {
  const house = useHouse();
  const { items, col } = useCollection<Underline>(UNDERLINE_PATH);
  const lines = underlinesOf(items, work.id);
  const overheard = house.isEnabled('amazeen');
  const { col: prefs } = useCollection<Prefs>(PREF_PATH);
  const hand = prefs.get('main')?.hand ?? false;
  const toggleOffer = (u: Underline) => {
    col.put({ ...u, offered: !u.offered });
    house.toast({ message: u.offered ? 'No longer offered to AMAZEEN.' : 'Offered to AMAZEEN’s Overheard page. You choose there whether to use it.', tone: 'accent' });
  };
  const read = work.started || work.finished ? `read ${[work.started, work.finished].filter(Boolean).map((d) => formatMonthYear(d!)).join('–')}` : '';
  return (
    <article className="mg-work">
      <button type="button" className="mg-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the catalogue
      </button>
      <header className="mg-work__head">
        <h1 className="mg-work__title">
          {work.title.toUpperCase()}
          {work.by && <span className="mg-work__by"> — {work.by}</span>}
        </h1>
        <p className="mg-work__meta">
          {KIND_LABEL[work.kind]}
          {read && ` · ${read}`}
          {work.landing && <span className="mg-work__landing"> · {landingLabel(work.landing)}</span>}
        </p>
      </header>
      <div className="mg-page">
        {lines.length === 0 ? (
          <div className="mg-line mg-line--empty">
            <p className="mg-passage mg-passage--empty">&nbsp;</p>
            <span className="mg-bracket" aria-hidden="true" />
            <p className="mg-margin mg-margin--pencil">Underline a line that stayed with you.</p>
          </div>
        ) : (
          lines.map((u) => (
            <div key={u.id} className={`mg-line ${u.id === justAdded ? 'is-new' : ''}`}>
              <blockquote className="mg-passage">
                <mark className="mg-hl">“{u.text}”</mark>
              </blockquote>
              <span className="mg-bracket" aria-hidden="true" />
              <div className="mg-margin">
                {u.note && <p className={`mg-margin__note ${hand && u.note.length <= 140 ? 'is-hand' : ''}`}>{u.note}</p>}
                {u.locator && <p className="mg-margin__loc">— {u.locator}</p>}
                <div className="mg-margin__tools">
                  <button type="button" className="mg-link" onClick={() => onUnderline(u)}>
                    Edit
                  </button>
                  {overheard && (
                    <button type="button" className="mg-link" aria-pressed={u.offered} onClick={() => toggleOffer(u)}>
                      {u.offered ? '✓ Offered to Overheard' : 'Send to AMAZEEN’s Overheard'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mg-work__actions">
        <Button variant="primary" icon="plus" onClick={() => onUnderline()}>
          Add an underline
        </Button>
        <Button variant="ghost" icon="pen" onClick={onEdit}>
          Edit the card
        </Button>
        <label className="check mg-handpref">
          <input type="checkbox" checked={hand} onChange={(e) => prefs.put({ id: 'main', hand: e.target.checked })} />
          <span className="check__box" aria-hidden="true" />
          Handwritten margin for short notes
        </label>
      </div>
    </article>
  );
}

/** Every underline, filtered by the year its work was read. */
function AllUnderlines({ search }: { search: URLSearchParams }) {
  const house = useHouse();
  const { items: works } = useCollection<Work>(WORK_PATH);
  const { items: lines } = useCollection<Underline>(UNDERLINE_PATH);
  const byId = new Map(works.map((w) => [w.id, w]));
  const years = [...new Set(works.map((w) => yearOf(w)).filter((y): y is string => !!y))].sort().reverse();
  const year = search.get('year') ?? 'all';
  const shown = lines.filter((u) => byId.has(u.workId) && (year === 'all' || yearOf(byId.get(u.workId)!) === year)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="mg-all" aria-labelledby="mg-all-title">
      <button type="button" className="mg-back" onClick={() => house.navigate(house.href('/'))}>
        <Icon name="left" size={16} /> Back to the catalogue
      </button>
      <h1 id="mg-all-title" className="mg-title">
        Every underline
      </h1>
      <label className="mg-select">
        <span>From works read in</span>
        <select value={year} onChange={(e) => house.navigate(house.href(e.target.value === 'all' ? '/underlines' : `/underlines?year=${e.target.value}`), { replace: true })}>
          <option value="all">Any year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      {shown.length === 0 ? (
        <p className="mg-empty__text">No underlines {year === 'all' ? 'yet' : `from works read in ${year}`}.</p>
      ) : (
        <ol className="mg-all__list">
          {shown.map((u) => {
            const w = byId.get(u.workId)!;
            return (
              <li key={u.id}>
                <blockquote className="mg-passage">
                  <mark className="mg-hl">“{u.text}”</mark>
                </blockquote>
                <p className="mg-all__src">
                  <button type="button" className="mg-link" onClick={() => house.navigate(house.href(`/work/${w.id}`))}>
                    {w.title}
                  </button>
                  {w.by && ` — ${w.by}`}
                  {u.locator && ` · ${u.locator}`} · {formatMedium(dayOf(u.createdAt))}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
