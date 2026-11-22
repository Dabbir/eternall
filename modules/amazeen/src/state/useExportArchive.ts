import { useCallback } from 'react';
import { useToast } from '../components/Toast';
import { serializeForExport } from '../domain/storage';
import { downloadText } from '../lib/download';
import { useStore } from './store';

/** Download the whole archive as dated JSON and record the backup time. */
export function useExportArchive(): () => void {
  const { data, markExported } = useStore();
  const toast = useToast();
  return useCallback(() => {
    const at = new Date();
    downloadText(serializeForExport({ ...data, lastExportedAt: at.toISOString() }), `amazeen-archive-${at.toISOString().slice(0, 10)}.json`);
    markExported();
    toast.push({ message: `Backed up ${data.entries.length} ${data.entries.length === 1 ? 'piece' : 'pieces'}.` });
  }, [data, markExported, toast]);
}
