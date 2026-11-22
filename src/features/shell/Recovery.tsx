import { Button } from '../../components/ui/Button';
import { Wordmark } from '../../components/ui/Logo';

/** Shown when stored data can't be read. Never silently discard someone's archive. */
export function Recovery({ raw, reason, onReset }: { raw: string; reason: string; onReset: () => void }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eternall-unreadable-backup.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main className="recovery" id="main">
      <Wordmark height={14} />
      <h1 className="display page-title">Your archive couldn’t be read.</h1>
      <p className="muted">
        Something in this browser’s stored data is damaged, so ETERNALL has paused rather than risk overwriting it. Download the raw data first — it can often
        be repaired by hand — then start fresh.
      </p>
      <p className="mono faint recovery__reason">{reason}</p>
      <div className="recovery__actions">
        <Button variant="primary" icon="download" onClick={download}>Download raw data</Button>
        <Button variant="danger" onClick={onReset}>Start fresh</Button>
      </div>
    </main>
  );
}
