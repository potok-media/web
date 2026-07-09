import React, { useEffect, useState, useCallback, useMemo } from "react";
import { webSocketClient } from "../network/WebSocketClient";
import { logger } from "../utils/logger";
import { Storage } from "../utils/StorageService";
import {
  type MediaSyncCallback,
  type SyncEventPayload,
  parseSyncPayload,
  passesSyncFilters,
} from "./syncEventTypes";

import { WSSyncContext, type WSSyncContextType } from "./wsSyncContextState";

export const WSSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientId] = useState(() => {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("potok_client_id");
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("potok_client_id", id);
    }
    return id;
  });

  // Keep a set of active listeners by mediaId
  const listenersRef = React.useRef<Record<string, Set<MediaSyncCallback>>>({});

  const subscribeToMedia = useCallback((mediaId: number, mediaType: string, callback: MediaSyncCallback) => {
    const key = `${mediaType}:${mediaId}`;
    if (!listenersRef.current[key]) {
      listenersRef.current[key] = new Set();
    }
    listenersRef.current[key].add(callback);
    return () => {
      listenersRef.current[key]?.delete(callback);
      if (listenersRef.current[key]?.size === 0) {
        delete listenersRef.current[key];
      }
    };
  }, []);

  const dispatchToMedia = useCallback((mediaId: number, mediaType: string, event: string, payload: SyncEventPayload, timestamp: string) => {
    const key = `${mediaType}:${mediaId}`;
    listenersRef.current[key]?.forEach(cb => {
      try {
        cb(event, payload, timestamp);
      } catch (err) {
        logger.error(`[WSSync] Error in local media subscriber:`, err);
      }
    });
  }, []);

  useEffect(() => {
    const activeID = Storage.get<string | null>("activeProfileID", null);

    const dispatchParsed = (event: string, data: string | unknown) => {
      const payload = parseSyncPayload(data);
      if (!payload) return;
      if (!passesSyncFilters(payload, clientId, activeID)) {
        if (payload.profileId && activeID && payload.profileId !== activeID) {
          logger.log(`[WSSync] Ignoring event because profile ID ${payload.profileId} does not match active profile ID ${activeID}`);
        }
        return;
      }
      dispatchToMedia(
        Number(payload.mediaId),
        payload.mediaType,
        event,
        payload,
        payload.timestamp || new Date().toISOString(),
      );
    };

    const handleHistoryChanged = (dataStr: string) => {
      try {
        dispatchParsed("sync:history:changed", dataStr);
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:history:changed payload", e);
      }
    };

    const handleHistoryBatchChanged = (dataStr: string) => {
      try {
        dispatchParsed("sync:history:batch_changed", dataStr);
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:history:batch_changed payload", e);
      }
    };

    const handleProgressChanged = (dataStr: string) => {
      try {
        dispatchParsed("sync:progress:changed", dataStr);
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:progress:changed payload", e);
      }
    };

    const handleLibraryUpdated = (dataStr: string) => {
      try {
        dispatchParsed("sync:library:updated", dataStr);
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:library:updated payload", e);
      }
    };

    const unsubHistory = webSocketClient.subscribe("sync:history:changed", handleHistoryChanged);
    const unsubHistoryBatch = webSocketClient.subscribe("sync:history:batch_changed", handleHistoryBatchChanged);
    const unsubProgress = webSocketClient.subscribe("sync:progress:changed", handleProgressChanged);
    const unsubLibrary = webSocketClient.subscribe("sync:library:updated", handleLibraryUpdated);

    return () => {
      unsubHistory();
      unsubHistoryBatch();
      unsubProgress();
      unsubLibrary();
    };
  }, [clientId, dispatchToMedia]);

  const value = useMemo<WSSyncContextType>(
    () => ({ clientId, subscribeToMedia }),
    [clientId, subscribeToMedia]
  );

  return (
    <WSSyncContext.Provider value={value}>
      {children}
    </WSSyncContext.Provider>
  );
};
