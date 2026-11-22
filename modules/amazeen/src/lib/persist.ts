/**
 * Persistent storage: asks the browser not to evict AMAZEEN's data under storage pressure
 * (and, on Safari, after 7 days without a visit). Returns null where the API doesn't exist.
 */
export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    return typeof navigator !== 'undefined' && navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
