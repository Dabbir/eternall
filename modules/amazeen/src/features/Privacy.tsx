import { Link, paths } from '../router/router';
import { useDocumentTitle } from '../state/hooks';
import styles from './Privacy.module.css';

/** Plain-language privacy notice. AMAZEEN has no server, so there is very little to say, and that's the point. */
export default function Privacy({ standalone = false }: { standalone?: boolean }) {
  useDocumentTitle('Privacy');
  return (
    <article className={`${styles.page} ${standalone ? styles.standalone : ''}`}>
      <p className="kicker">The fine print, not so fine</p>
      <h1 className={styles.title}>Privacy</h1>
      <div className={styles.body}>
        <p className={styles.lede}>Your magazine is yours. AMAZEEN has no accounts, no tracking, and no way to read what you write, even if you turn on sync.</p>
        <h2>Where your writing lives</h2>
        <p>
          By default, everything you write is stored only in this browser, on this device (in IndexedDB). It is not uploaded. If you clear this site’s data
          or lose the device, it’s gone. That’s why AMAZEEN reminds you to export a backup.
        </p>
        <h2>If you turn on sync</h2>
        <p>
          Sync keeps one journal across your devices. Your entries are encrypted <em>on your device</em>, with a key made from your sync key, before they are
          sent. The server stores only scrambled data it cannot read. Your sync key is never sent; the server only sees a separate token derived from it.
        </p>
        <p>
          The server can see that records exist, when they last changed, roughly how large they are, and an identifier for each. It cannot see titles, text,
          moods, sections, or your magazine’s name.
        </p>
        <p>
          <strong>If you lose your sync key, the cloud copy can’t be recovered</strong>, by you or by us. Your writing on your devices stays. You can delete
          the cloud copy at any time in the Office; it is removed from the server immediately.
        </p>
        <h2>What we collect</h2>
        <p>
          Nothing about what you write. There are no analytics, cookies, advertising or third-party scripts. Fonts and code are served from the same address
          as the app. Our hosting provider keeps standard, short-lived request logs (such as IP address and time) to run and protect the service, as every
          website’s host does; with sync on, those logs include requests to the sync service.
        </p>
        <h2>Backups and moving devices</h2>
        <p>
          Exports are ordinary JSON files that you download and keep wherever you like. Importing reads the file inside your browser. It is not
          sent anywhere.
        </p>
        <h2>Deleting everything</h2>
        <p>
          Office → Erase everything permanently removes your archive, drafts and settings from this browser (and disconnects sync on it). Office → Sync →
          Delete cloud copy removes the encrypted copy from the server.
        </p>
      </div>
      <p className={styles.back}>
        <Link to={paths.desk()}>← Back to AMAZEEN</Link>
      </p>
    </article>
  );
}
