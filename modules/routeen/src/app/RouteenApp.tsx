import '@fontsource/young-serif/latin-400.css';
import '@fontsource/work-sans/latin-400.css';
import '@fontsource/work-sans/latin-400-italic.css';
import '@fontsource/work-sans/latin-600.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-600.css';
import '../theme/routeen.css';
import '../theme/routeen.kit.css';
import { useEffect, useState } from 'react';
import { formatMedium, isValidISO, type ImprintAppProps } from '@eternall/core';
import { useAppLook, useHouse, usePrimaryAction } from '@eternall/kit';
import { Button } from '@eternall/ui';
import { useCollection } from '@eternall/vault';
import { copy } from '../copy';
import { LOOK_PATH, ROUTEEN_LOOKS } from '../look';
import { PRACTICE_PATH, type Practice } from '../practices';
import { Chrome, type RouteenPlace } from './Chrome';
import { PracticeEditor } from './PracticeEditor';
import { Today } from './Today';

/**
 * ROUTEEN · Langit Hari (spec §4): Today at `/`, the Sky at `/sky`, one day at `/day/<ISO>` and one
 * practice at `/practice/<id>`. Old `/cloth` links open the Sky. Home's `?new=1` opens the editor;
 * `?mark=1` simply opens Today.
 */
export default function RouteenApp({ path, search }: ImprintAppProps) {
  const house = useHouse();
  const { items } = useCollection<Practice>(PRACTICE_PATH);
  const [editing, setEditing] = useState<null | { existing?: Practice }>(search.get('new') ? {} : null);
  const practiceMatch = /^\/practice\/([A-Za-z0-9_-]+)$/.exec(path);
  const dayMatch = /^\/day\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  const practice = practiceMatch ? items.find((p) => p.id === practiceMatch[1]) : undefined;
  const day = dayMatch && isValidISO(dayMatch[1]) ? dayMatch[1] : undefined;
  const here: RouteenPlace = path === '/sky' || path === '/cloth' ? 'sky' : practice ? 'practice' : day ? 'day' : 'today';
  // The person's look for their sky (docs/adr/0014), worn while ROUTEEN is open.
  useAppLook(ROUTEEN_LOOKS, LOOK_PATH);
  usePrimaryAction({ label: copy.newPractice, run: () => setEditing({}) });

  useEffect(() => {
    if (path === '/cloth') house.navigate(house.href('/sky'), { replace: true });
  }, [path, house]);

  return (
    <Chrome here={here}>
      <div className="rs">
        {here === 'sky' ? (
          <SkyPlaceholder />
        ) : practice ? (
          <PracticePlaceholder practice={practice} onEdit={() => setEditing({ existing: practice })} />
        ) : day ? (
          <DayPlaceholder date={day} />
        ) : (
          <Today />
        )}
        {editing && <PracticeEditor key={editing.existing?.id ?? 'new'} {...editing} onClose={() => setEditing(null)} />}
      </div>
    </Chrome>
  );
}

/** The archive lands in Task 8. */
function SkyPlaceholder() {
  return (
    <header className="rs-head">
      <h1 className="rs-title">{copy.sky.title}</h1>
    </header>
  );
}

/** A day's page lands in Task 8. */
function DayPlaceholder({ date }: { date: string }) {
  return (
    <header className="rs-head">
      <p className="rs-eyebrow">{copy.day.thatDay}</p>
      <h1 className="rs-title">{formatMedium(date)}</h1>
    </header>
  );
}

/** A practice's page lands in Task 8. */
function PracticePlaceholder({ practice, onEdit }: { practice: Practice; onEdit(): void }) {
  return (
    <header className="rs-head">
      <h1 className="rs-title">{practice.name}</h1>
      <Button variant="ghost" icon="pen" onClick={onEdit}>
        {copy.editPractice}
      </Button>
    </header>
  );
}
