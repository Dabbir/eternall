import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Chapter, ISODate, Inscription } from '../../domain/types';
import { useStore } from '../../store/StoreProvider';
import { CapsuleComposer } from './CapsuleComposer';
import { CapsuleReader } from './CapsuleReader';
import { ChapterEditor } from './ChapterEditor';
import { InscriptionEditor } from './InscriptionEditor';

type Editor =
  | { kind: 'inscription'; existing?: Inscription; date?: ISODate }
  | { kind: 'capsule'; opensOn?: ISODate }
  | { kind: 'reader'; id: string }
  | { kind: 'chapter'; existing?: Chapter; start?: ISODate };

interface Editors {
  inscribe: (opts?: { existing?: Inscription; date?: ISODate }) => void;
  composeCapsule: (opts?: { opensOn?: ISODate }) => void;
  readCapsule: (id: string) => void;
  editChapter: (opts?: { existing?: Chapter; start?: ISODate }) => void;
}

const EditorsContext = createContext<Editors | null>(null);

/** One place that owns every editing dialog, so any screen (or the command palette) can open them. */
export function EditorsProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const { data } = useStore();
  const close = useCallback(() => setEditor(null), []);

  const api = useMemo<Editors>(
    () => ({
      inscribe: (o) => setEditor({ kind: 'inscription', ...o }),
      composeCapsule: (o) => setEditor({ kind: 'capsule', ...o }),
      readCapsule: (id) => setEditor({ kind: 'reader', id }),
      editChapter: (o) => setEditor({ kind: 'chapter', ...o }),
    }),
    [],
  );

  let dialog: ReactNode = null;
  if (editor && data.profile) {
    switch (editor.kind) {
      case 'inscription':
        dialog = <InscriptionEditor existing={editor.existing} date={editor.date} onClose={close} />;
        break;
      case 'capsule':
        dialog = <CapsuleComposer opensOn={editor.opensOn} onClose={close} />;
        break;
      case 'reader': {
        const capsule = data.capsules.find((c) => c.id === editor.id);
        dialog = capsule ? <CapsuleReader key={capsule.id} capsule={capsule} onClose={close} /> : null;
        break;
      }
      case 'chapter':
        dialog = <ChapterEditor existing={editor.existing} start={editor.start} onClose={close} />;
        break;
    }
  }

  return (
    <EditorsContext.Provider value={api}>
      {children}
      {dialog}
    </EditorsContext.Provider>
  );
}

export function useEditors(): Editors {
  const ctx = useContext(EditorsContext);
  if (!ctx) throw new Error('useEditors must be used inside <EditorsProvider>');
  return ctx;
}
