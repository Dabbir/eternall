import type { ImprintDefinition, ReadContext } from '@eternall/core';
import { Button } from '@eternall/ui';
import { linkProps, navigate } from '../shell/router';

const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

/**
 * Home (docs/adr/0014, docs/design/eternall.md §5.0): one card per app that is on, each with a short
 * status and the one thing to do next, then the way to "Your life in weeks". Calm and plain, so the
 * apps keep their character. Money never shows a figure here. For a new person it is also the welcome.
 */
export function Home({ ctx, enabled, empty }: { ctx: ReadContext; enabled: readonly ImprintDefinition[]; empty: boolean }) {
  const name = ctx.profile?.name;
  return (
    <section className="home" aria-labelledby="home-title">
      <header className="home__head">
        <p className="eyebrow">{weekday(ctx.today)}</p>
        <h1 id="home-title" className="display home__title">
          {empty ? (
            <>
              Write as usual. <em>See your week again.</em>
            </>
          ) : (
            <>
              {greeting()}
              {name ? `, ${name}` : ''}.
            </>
          )}
        </h1>
        {empty && <p className="muted home__lede">A private journal, your money in one line, and the practices you return to. Everything stays on this device, encrypted. Nothing to set up first.</p>}
      </header>

      <ul className="home__cards">
        {enabled.map((d) => {
          const card = d.home?.(ctx) ?? { status: d.functionLine, action: { label: `Open ${d.name}`, href: d.basePath } };
          return (
            <li key={d.id} className={`home-card home-card--${d.id}`} style={{ ['--c' as string]: d.accent.light, ['--c-dark' as string]: d.accent.dark }}>
              <a className="home-card__head" {...linkProps(d.basePath)}>
                <span className="home-card__label">{d.label}</span>
                <span className="home-card__name">
                  {d.name} · {d.functionLine}
                </span>
              </a>
              <p className="home-card__status">{card.status}</p>
              <Button variant="primary" onClick={() => navigate(card.action.href)}>
                {card.action.label}
              </Button>
            </li>
          );
        })}
      </ul>

      <footer className="home__foot">
        <a className="home__life" {...linkProps('/life')}>
          {ctx.profile ? 'Your life in weeks →' : 'Draw your life in weeks →'}
        </a>
        {empty && (
          <>
            <button type="button" className="welcome__adopt" onClick={() => window.dispatchEvent(new CustomEvent('eternall:setup', { detail: { mode: 'adopt' } }))}>
              I already have an ETERNALL vault on another device
            </button>
            <p className="faint home__privacy">Private by design — no accounts, no tracking, nothing you write leaves this device unencrypted.</p>
          </>
        )}
      </footer>
    </section>
  );
}
