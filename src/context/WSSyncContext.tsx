import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { webSocketClient } from "../network/WebSocketClient";
import { logger } from "../utils/logger";
import { Storage } from "../utils/StorageService";

interface WSSyncContextType {
  clientId: string;
  subscribeToMedia: (mediaId: number, mediaType: string, callback: (event: string, payload: any, timestamp: string) => void) => () => void;
}

const WSSyncContext = createContext<WSSyncContextType | null>(null);

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
  const listenersRef = React.useRef<Record<string, Set<(event: string, payload: any, timestamp: string) => void>>>({});

  const subscribeToMedia = useCallback((mediaId: number, mediaType: string, callback: (event: string, payload: any, timestamp: string) => void) => {
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

  const dispatchToMedia = useCallback((mediaId: number, mediaType: string, event: string, payload: any, timestamp: string) => {
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

    const checkFilters = (payload: any): boolean => {
      // Pitfall 1: Self-Loop (echo) prevention
      if (payload.senderId && payload.senderId === clientId) {
        return false;
      }
      // Pitfall 17: Profile Bleeding prevention
      if (payload.profileId && activeID && payload.profileId !== activeID) {
        logger.log(`[WSSync] Ignoring event because profile ID ${payload.profileId} does not match active profile ID ${activeID}`);
        return false;
      }
      return true;
    };

    const handleHistoryChanged = (dataStr: string) => {
      try {
        const payload = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
        if (!checkFilters(payload)) return;
        dispatchToMedia(Number(payload.mediaId), payload.mediaType, "sync:history:changed", payload, payload.timestamp || new Date().toISOString());
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:history:changed payload", e);
      }
    };

    const handleHistoryBatchChanged = (dataStr: string) => {
      try {
        const payload = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
        if (!checkFilters(payload)) return;
        dispatchToMedia(Number(payload.mediaId), payload.mediaType, "sync:history:batch_changed", payload, payload.timestamp || new Date().toISOString());
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:history:batch_changed payload", e);
      }
    };

    const handleProgressChanged = (dataStr: string) => {
      try {
        const payload = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
        if (!checkFilters(payload)) return;
        dispatchToMedia(Number(payload.mediaId), payload.mediaType, "sync:progress:changed", payload, payload.timestamp || new Date().toISOString());
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:progress:changed payload", e);
      }
    };

    const handleLibraryUpdated = (dataStr: string) => {
      try {
        const payload = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
        if (!checkFilters(payload)) return;
        dispatchToMedia(Number(payload.mediaId), payload.mediaType, "sync:library:updated", payload, payload.timestamp || new Date().toISOString());
      } catch (e) {
        logger.error("[WSSync] failed to parse sync:library:updated payload", e);
      }
    };

    const handleTorrentProgress = (dataStr: string) => {
      try {
        const payload = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
        const key = `torrent:${payload.hash}`;
        listenersRef.current[key]?.forEach(cb => {
          try {
            cb("torrent:stream:progress", payload, new Date().toISOString());
          } catch (err) {
            logger.error(`[WSSync] Error in torrent progress subscriber:`, err);
          }
        });
      } catch (e) {
        logger.error("[WSSync] failed to parse torrent:stream:progress payload", e);
      }
    };

    const unsubHistory = webSocketClient.subscribe("sync:history:changed", handleHistoryChanged);
    const unsubHistoryBatch = webSocketClient.subscribe("sync:history:batch_changed", handleHistoryBatchChanged);
    const unsubProgress = webSocketClient.subscribe("sync:progress:changed", handleProgressChanged);
    const unsubLibrary = webSocketClient.subscribe("sync:library:updated", handleLibraryUpdated);
    const unsubTorrent = webSocketClient.subscribe("torrent:stream:progress", handleTorrentProgress);

    return () => {
      unsubHistory();
      unsubHistoryBatch();
      unsubProgress();
      unsubLibrary();
      unsubTorrent();
    };
  }, [clientId, dispatchToMedia]);

  return (
    <WSSyncContext.Provider value={{ clientId, subscribeToMedia }}>
      {children}
    </WSSyncContext.Provider>
  );
};

export const useWSSync = () => {
  const context = useContext(WSSyncContext);
  if (!context) {
    throw new Error("useWSSync must be used within a WSSyncProvider");
  }
  return context;
};
