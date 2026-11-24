import "@fontsource/young-serif/latin-400.css";
import "@fontsource/work-sans/latin-400.css";
import "@fontsource/work-sans/latin-400-italic.css";
import "@fontsource/work-sans/latin-600.css";
import "@fontsource/literata/latin-400.css";
import "@fontsource/literata/latin-600.css";
import "../theme/routeen.css";
import "../theme/routeen.kit.css";
import { useEffect, useState } from "react";
import { isValidISO, type ImprintAppProps } from "@eternall/core";
import { useAppLook, useHouse, usePrimaryAction } from "@eternall/kit";
import { copy } from "../copy";
import { LOOK_PATH, ROUTEEN_LOOKS } from "../look";
import type { Practice } from "../practices";
import { Chrome, type RouteenPlace } from "./Chrome";
import { DayPage } from "./DayPage";
import { Go } from "./Go";
import { PracticeEditor } from "./PracticeEditor";
import { PracticePage } from "./PracticePage";
import { Sky } from "./Sky";
import { Today } from "./Today";
import { useRoutine } from "./useRoutine";

/**
 * ROUTEEN · Langit Hari (spec §4): Today at `/`, the Sky at `/sky`, one day at `/day/<ISO>` and one
 * practice at `/practice/<id>`. Old `/cloth` links open the Sky. Home's `?new=1` opens the editor;
 * `?mark=1` simply opens Today. One `useRoutine()` here, so every page reads the same clock.
 * An unknown practice or an impossible date says so, with the way back to Today.
 */
export default function RouteenApp({ path, search }: ImprintAppProps) {
  const house = useHouse();
  const r = useRoutine();
  const [editing, setEditing] = useState<null | { existing?: Practice }>(
    search.get("new") ? {} : null,
  );
  const practiceMatch = /^\/practice\/([^/]+)$/.exec(path);
  const dayMatch = /^\/day\/([^/]+)$/.exec(path);
  const practice = practiceMatch
    ? r.practices.find((p) => p.id === practiceMatch[1])
    : undefined;
  const day = dayMatch && isValidISO(dayMatch[1]) ? dayMatch[1] : undefined;
  const here: RouteenPlace =
    path === "/sky" || path === "/cloth"
      ? "sky"
      : practiceMatch
        ? "practice"
        : dayMatch
          ? "day"
          : "today";
  // The person's look for their sky (docs/adr/0014), worn while ROUTEEN is open.
  const look = useAppLook(ROUTEEN_LOOKS, LOOK_PATH);
  const startNew = () => setEditing({});
  usePrimaryAction({ label: copy.newPractice, run: startNew });

  useEffect(() => {
    if (path === "/cloth")
      house.navigate(house.href("/sky"), { replace: true });
  }, [path, house]);

  return (
    <Chrome here={here}>
      <div className="rs">
        {here === "sky" ? (
          <Sky routine={r} look={look} />
        ) : practiceMatch ? (
          practice ? (
            <PracticePage
              practice={practice}
              routine={r}
              onEdit={() => setEditing({ existing: practice })}
            />
          ) : (
            <NotFound line={copy.notFound.practice} />
          )
        ) : dayMatch ? (
          day ? (
            <DayPage date={day} routine={r} />
          ) : (
            <NotFound line={copy.notFound.day} />
          )
        ) : (
          <Today routine={r} onNew={startNew} />
        )}
        {editing && (
          <PracticeEditor
            key={editing.existing?.id ?? "new"}
            {...editing}
            today={r.today}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </Chrome>
  );
}

function NotFound({ line }: { line: string }) {
  return (
    <div className="rs-page">
      <div className="rs-notfound">
        <p className="rs-lede">{line}</p>
        <Go to="/">{copy.notFound.back}</Go>
      </div>
    </div>
  );
}
