import { useState } from 'react';
import { capsuleStatus, sealProgress, verifySeal } from '../../domain/capsule';
import { diffDays } from '../../domain/time';
import type { Capsule } from '../../domain/types';
import { formatCountdown, formatLong, formatMedium, plural } from '../../lib/format';
import { prefersReducedMotion } from '../../lib/theme';
import { useProfileStore } from '../../store/StoreProvider';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { Seal } from '../../components/ui/Seal';
import { useToast } from '../../components/ui/Toast';

type Stage = 'closed' | 'breaking' | 'open';

export function CapsuleReader({ capsule, onClose }: { capsule: Capsule; onClose: () => void }) {
  const { profile, today, dispatch } = useProfileStore();
  const toast = useToast();
  const status = capsuleStatus(capsule, today);
  const [stage, setStage] = useState<Stage>(status === 'opened' ? 'open' : 'closed');
  const [intact, setIntact] = useState<boolean | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const breakSeal = async () => {
    setStage('breaking');
    const [ok] = await Promise.all([
      verifySeal(capsule).catch(() => false),
      new Promise((r) => window.setTimeout(r, prefersReducedMotion() ? 50 : 1000)),
    ]);
    setIntact(ok);
    dispatch({ type: 'capsule/open', id: capsule.id, at: new Date().toISOString() });
    setStage('open');
  };

  const remove = () => {
    dispatch({ type: 'capsule/remove', id: capsule.id });
    toast({
      message: status === 'sealed' ? 'Capsule destroyed, unread.' : 'Letter removed.',
      action: { label: 'Undo', run: () => dispatch({ type: 'capsule/add', capsule }) },
    });
    onClose();
  };

  const waited = diffDays(capsule.sealedOn, capsule.opensOn);

  const removeBar = confirmRemove ? (
    <div className="confirm-bar">
      <p>{status === 'sealed' ? 'Destroy this capsule without ever reading it?' : 'Remove this letter for good?'}</p>
      <Button variant="quiet" onClick={() => setConfirmRemove(false)}>Keep it</Button>
      <Button variant="danger" onClick={remove}>{status === 'sealed' ? 'Destroy' : 'Remove'}</Button>
    </div>
  ) : null;

  if (status === 'sealed') {
    const progress = sealProgress(capsule, today);
    return (
      <Dialog
        open
        onClose={onClose}
        title={capsule.title}
        eyebrow="Sealed capsule"
        size="stage"
        footer={removeBar ?? (
          <>
            <Button variant="quiet" icon="trash" onClick={() => setConfirmRemove(true)}>Destroy</Button>
            <span className="spacer" />
            <Button variant="primary" onClick={onClose}>Leave it sealed</Button>
          </>
        )}
      >
        <div className="reader reader--sealed">
          <div className="reader__ring" style={{ ['--p' as string]: progress }}>
            <Seal fingerprint={capsule.fingerprint} initial={profile.name} size={128} label="Wax seal, unbroken" />
          </div>
          <p className="display reader__countdown">Opens {formatCountdown(today, capsule.opensOn)}</p>
          <p className="muted">
            {formatLong(capsule.opensOn)} · sealed {formatMedium(capsule.sealedOn)} · {Math.round(progress * 100)}% of the wait behind you
          </p>
        </div>
      </Dialog>
    );
  }

  if (stage !== 'open') {
    return (
      <Dialog open onClose={onClose} title={capsule.title} hideTitle size="stage">
        <div className="reader reader--ready">
          <Seal
            fingerprint={capsule.fingerprint}
            initial={profile.name}
            size={160}
            broken={stage === 'breaking'}
            className="reader__seal"
            label={stage === 'breaking' ? 'The seal breaks' : 'Wax seal, ready to break'}
          />
          <h3 className="display reader__title">{capsule.title}</h3>
          <p className="muted">
            Sealed on {formatLong(capsule.sealedOn)}. It has waited {plural(waited, 'day')} for you.
          </p>
          <Button variant="seal" onClick={() => void breakSeal()} busy={stage === 'breaking'} autoFocus>
            Break the seal
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={capsule.title}
      hideTitle
      size="stage"
      footer={removeBar ?? (
        <>
          <Button variant="quiet" icon="trash" onClick={() => setConfirmRemove(true)}>Remove</Button>
          <span className="spacer" />
          <Button variant="primary" onClick={onClose}>Fold it away</Button>
        </>
      )}
    >
      <article className="letter">
        {intact !== null && (
          <p className={`letter__verdict ${intact ? 'is-ok' : 'is-bad'}`}>
            <Icon name={intact ? 'check' : 'close'} size={14} />
            {intact ? 'Seal intact — exactly as you wrote it.' : 'The seal didn’t match. This letter may have been altered.'}
          </p>
        )}
        <h3 className="display letter__title">{capsule.title}</h3>
        <div className="letter__body">
          {capsule.body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="prose" style={{ ['--i' as string]: i }}>
              {para}
            </p>
          ))}
        </div>
        <p className="letter__meta mono faint">
          Sealed {formatMedium(capsule.sealedOn)} · opened {capsule.openedAt ? formatMedium(capsule.openedAt.slice(0, 10)) : 'today'} ·{' '}
          {plural(waited, 'day')} in the dark
        </p>
      </article>
    </Dialog>
  );
}
