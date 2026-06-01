import { useState, useCallback, useEffect } from "react";
import { Storage } from "../utils/StorageService";
import { SettingsApiClient } from "../network/SettingsApiClient";
import type { PatchOperation } from "../network/ApiTypes";
import { useSettings } from "../context/AppSettingsContext";

const QUEUE_STORAGE_KEY_PREFIX = "settings_patch_queue_";

export function usePatchQueue() {
  const { activeProfileID } = useSettings();
  const profileId = activeProfileID || "default-profile";
  const storageKey = `${QUEUE_STORAGE_KEY_PREFIX}${profileId}`;

  const [queue, setQueue] = useState<PatchOperation[]>(() => {
    return Storage.get<PatchOperation[]>(storageKey, []);
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Synchronize state with storage when changes occur
  const saveQueue = useCallback(
    (newQueue: PatchOperation[]) => {
      Storage.set(storageKey, newQueue);
      setQueue(newQueue);
    },
    [storageKey]
  );

  // Sync state whenever the active connection profile switches
  useEffect(() => {
    setQueue(Storage.get<PatchOperation[]>(storageKey, []));
    setSyncError(null);
    setIsSyncing(false);
  }, [storageKey]);

  // Queue a single setting change operation
  const addOperation = useCallback(
    (op: PatchOperation) => {
      const currentQueue = Storage.get<PatchOperation[]>(storageKey, []);
      saveQueue([...currentQueue, op]);
    },
    [storageKey, saveQueue]
  );

  // Queue multiple operations at once
  const addOperations = useCallback(
    (ops: PatchOperation[]) => {
      const currentQueue = Storage.get<PatchOperation[]>(storageKey, []);
      saveQueue([...currentQueue, ...ops]);
    },
    [storageKey, saveQueue]
  );

  // Clear all pending operations
  const clearQueue = useCallback(() => {
    saveQueue([]);
  }, [saveQueue]);

  // Synchronize queued changes to the backend in sequential order
  const syncQueue = useCallback(async (): Promise<void> => {
    if (isSyncing) return;
    const pendingOps = Storage.get<PatchOperation[]>(storageKey, []);
    if (pendingOps.length === 0) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Send sequential batch patch operations to backend settings endpoint
      await SettingsApiClient.applyPatches(profileId, pendingOps);
      // Once successfully applied to the API, wipe local patch queue
      saveQueue([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Offline patch queue sync failed";
      setSyncError(errorMsg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [profileId, isSyncing, storageKey, saveQueue]);

  return {
    queue,
    pendingCount: queue.length,
    isSyncing,
    syncError,
    addOperation,
    addOperations,
    clearQueue,
    syncQueue,
  };
}
