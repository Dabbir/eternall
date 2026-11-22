import { capsuleStatus, sealProgress, sortCapsules, type CapsuleStatus } from '../../domain/capsule';
import type { Capsule } from '../../domain/types';
import { formatCountdown, formatLong, formatMedium, plural } from '../../lib/format';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Seal } from '../../components/ui/Seal';
import { useEditors } from '../editors/EditorsProvider';

const SECTIONS: { status: CapsuleStatus; title: string; blurb: string }[] = [
  { status: 'ready', title: 'Ready to open', blurb: 'Their day has come.' },
  { status: 'sealed', title: 'Sealed', blurb: 'Waiting quietly in the weeks ahead.' },
  { status: 'opened', title: 'Opened', blurb: 'Letters that found you.' },
];

export function CapsulesView() {
  const { data, today, profile } = useProfileStore();
  const editors = useEditors();
  const sorted = sortCapsules(data.capsules, today);
  const sealedCount = sorted.filter((c) => capsuleStatus(c, today) === 'sealed').length;

  return (
    <div className="capsules">
      <header className="page-head page-head--split">
        <div>
          <p className="eyebrow rise">Capsules</p>
          <h1 className="display page-title rise" style={{ ['--i' as string]: 1 }}>
            Write to the person <em>you’re becoming.</em>
          </h1>
          {sealedCount > 0 && (
            <p className="muted rise" style={{ ['--i' as string]: 2 }}>
              {plural(sealedCount, 'letter')} waiting in your future.
            </p>
          )}
        </div>
        <Button variant="seal" icon="plus" className="rise" style={{ ['--i' as string]: 2 }} onClick={() => editors.composeCapsule()}>
          New capsule
        </Button>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          art={<Seal fingerprint={'9f3c2a71'.repeat(8)} initial={profile.name} size={88} />}
          title="No letters sealed yet."
          action={<Button variant="seal" onClick={() => editors.composeCapsule()}>Seal your first letter</Button>}
        >
          Write something now, choose a day in your future, and seal it. It stays unreadable — even to you — until that week arrives on your lifeline.
        </EmptyState>
      ) : (
        SECTIONS.map(({ status, title, blurb }) => {
          const list = sorted.filter((c) => capsuleStatus(c, today) === status);
          if (!list.length) return null;
          return (
            <section key={status} className={`capsule-section capsule-section--${status}`} aria-labelledby={`cs-${status}`}>
              <header className="section-head">
                <h2 id={`cs-${status}`} className="display">{title}</h2>
                <p className="faint">{blurb}</p>
              </header>
              <ul className="capsule-grid">
                {list.map((c, i) => (
                  <li key={c.id} className="rise" style={{ ['--i' as string]: i }}>
                    <CapsuleCard capsule={c} status={status} onOpen={() => editors.readCapsule(c.id)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function CapsuleCard({ capsule, status, onOpen }: { capsule: Capsule; status: CapsuleStatus; onOpen: () => void }) {
  const { today, profile } = useProfileStore();
  const progress = sealProgress(capsule, today);
  return (
    <button type="button" className={`capsule-card capsule-card--${status}`} onClick={onOpen}>
      <span className="capsule-card__seal">
        <Seal fingerprint={capsule.fingerprint} initial={profile.name} size={status === 'opened' ? 52 : 68} />
      </span>
      <span className="capsule-card__text">
        <span className="capsule-card__title display">{capsule.title}</span>
        <span className="capsule-card__meta mono">
          {status === 'sealed' && <>Opens {formatCountdown(today, capsule.opensOn)}</>}
          {status === 'ready' && <>Opened for you on {formatLong(capsule.opensOn)}</>}
          {status === 'opened' && <>Sealed {formatMedium(capsule.sealedOn)} · opened {formatMedium((capsule.openedAt ?? capsule.opensOn).slice(0, 10))}</>}
        </span>
        {status === 'sealed' && (
          <span className="capsule-card__progress" role="progressbar" aria-label="Time until opening" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${Math.max(2, progress * 100)}%` }} />
          </span>
        )}
        {status === 'opened' && <span className="capsule-card__excerpt">{capsule.body}</span>}
      </span>
      {status === 'ready' && <span className="capsule-card__cta">Break the seal →</span>}
    </button>
  );
}
