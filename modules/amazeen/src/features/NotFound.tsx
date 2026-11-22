import ui from '../components/ui.module.css';
import { Link, paths } from '../router/router';
import { useDocumentTitle } from '../state/hooks';

export function NotFound({ title = 'This page never went to print.', text = 'The link might be mistyped, or the page was pulled before the presses rolled.' }: { title?: string; text?: string }) {
  useDocumentTitle('Not found');
  return (
    <section className={ui.statePage}>
      <p className="kicker">Error 404 · Missing page</p>
      <h1 className={ui.stateTitle}>{title}</h1>
      <p className={ui.stateText}>{text}</p>
      <div className={ui.stateActions}>
        <Link to={paths.desk()} className={`${ui.btn} ${ui.dark}`}>
          Back to the desk
        </Link>
        <Link to={paths.shelf()} className={ui.btn}>
          Browse the shelf
        </Link>
      </div>
    </section>
  );
}
