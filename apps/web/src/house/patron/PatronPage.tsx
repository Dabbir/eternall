import { useEffect, useRef, useState } from 'react';
import { formatLong } from '@eternall/core';
import { Button, Icon, TextField, useToast } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { navigate } from '../../shell/router';
import { api, LICENCE_PATH, usePatron, type LicenceRecord } from '../../vault/patron';

const PERKS = [
  { title: 'Sync across your devices', text: 'End-to-end encrypted. The server keeps only ciphertext it can’t read.' },
  { title: 'Immersive modes', text: 'The life coil, the breaking seal, the bookshelf in the round, the mechanical orrery, tilting covers.' },
  { title: 'Support an independent house', text: 'No ads, no data sold, ever. Patrons keep the lights on.' },
];

/** ETERNALL Patron (docs/BUSINESS.md, docs/FLOWS.md F8). Free stays complete; this is support, not a wall. */
export function PatronPage({ search }: { search: URLSearchParams }) {
  const toast = useToast();
  const patron = usePatron();
  const { col } = useCollection<LicenceRecord>(LICENCE_PATH);
  const [busy, setBusy] = useState<null | 'monthly' | 'yearly' | 'claim'>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const claimed = useRef(false);

  const redeem = async (c: string) => {
    setBusy('claim');
    setError(null);
    try {
      const { token } = await api<{ token: string }>('/licence/claim', { code: c.trim() });
      col.put({ id: 'current', token });
      toast({ message: 'Welcome, Patron. Thank you for keeping the house open.', tone: 'accent' });
      navigate('/patron', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work.');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    const c = search.get('claim');
    if (c && !claimed.current) {
      claimed.current = true;
      void redeem(c);
    }
    // Redeem once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = async (plan: 'monthly' | 'yearly') => {
    setBusy(plan);
    setError(null);
    try {
      const { url } = await api<{ url: string }>('/checkout', { plan });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout isn’t available right now.');
      setBusy(null);
    }
  };

  return (
    <div className="patron">
      <header className="page-head">
        <p className="eyebrow rise">ETERNALL Patron</p>
        <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
          {patron.active ? (
            <>
              You keep the house <em>open.</em>
            </>
          ) : (
            <>
              Become a patron of <em>the house.</em>
            </>
          )}
        </h1>
        <p className="muted rise" style={{ ['--i' as string]: 2 }}>
          {patron.active && patron.payload
            ? `Patron until ${formatLong(patron.payload.exp.slice(0, 10))}. Everything below is yours.`
            : 'Every imprint is free, complete and private without it. Your data stays yours either way.'}
        </p>
      </header>

      <ul className="patron__perks">
        {PERKS.map((p, i) => (
          <li key={p.title} className="rise" style={{ ['--i' as string]: i + 2 }}>
            <Icon name={patron.active ? 'check' : 'sparkle'} size={18} />
            <span>
              <strong>{p.title}</strong>
              <span className="muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>

      {!patron.active && (
        <section className="patron__plans" aria-label="Plans">
          <button type="button" className="patron-plan" onClick={() => void checkout('monthly')} disabled={!!busy}>
            <span className="patron-plan__name">Monthly</span>
            <span className="patron-plan__price">Set at launch</span>
            <span className="patron-plan__cta">{busy === 'monthly' ? 'Opening checkout…' : 'Continue to checkout →'}</span>
          </button>
          <button type="button" className="patron-plan is-featured" onClick={() => void checkout('yearly')} disabled={!!busy}>
            <span className="patron-plan__name">Yearly</span>
            <span className="patron-plan__price">About ten months’ price</span>
            <span className="patron-plan__cta">{busy === 'yearly' ? 'Opening checkout…' : 'Continue to checkout →'}</span>
          </button>
        </section>
      )}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <section className="patron__restore">
        <h2 className="display">Restore a purchase</h2>
        <p className="muted">Paste the claim code from your receipt. ETERNALL never sees your email or name — those stay with the payment provider.</p>
        <form
          className="patron__restore-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (code) void redeem(code);
          }}
        >
          <TextField label="Claim code" value={code} autoComplete="off" spellCheck={false} onChange={(e) => setCode(e.target.value)} />
          <Button variant="ghost" type="submit" busy={busy === 'claim'} disabled={!code}>
            Redeem
          </Button>
        </form>
      </section>
    </div>
  );
}
