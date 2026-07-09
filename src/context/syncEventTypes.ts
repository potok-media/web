/** Base fields shared by all WebSocket sync events routed through WSSyncContext. */
export interface SyncEventBase {
  mediaId: number | string;
  mediaType: string;
  senderId?: string;
  profileId?: string;
  timestamp?: string;
}

export interface SyncHistoryChangedPayload extends SyncEventBase {
  seasonNumber?: number;
  episodeNumber?: number;
  isWatched?: boolean;
}

export interface SyncHistoryBatchChangedPayload extends SyncEventBase {
  changes?: { seasonNumber: number; episodeNumber: number; isWatched: boolean }[];
}

export interface SyncProgressChangedPayload extends SyncEventBase {
  progress?: number;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface SyncLibraryUpdatedPayload extends SyncEventBase {
  listType?: string;
  action?: string;
}

export type SyncEventPayload =
  | SyncHistoryChangedPayload
  | SyncHistoryBatchChangedPayload
  | SyncProgressChangedPayload
  | SyncLibraryUpdatedPayload;

export type MediaSyncCallback = (
  event: string,
  payload: SyncEventPayload,
  timestamp: string,
) => void;

export function parseSyncPayload(data: string | unknown): SyncEventPayload | null {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object" && "mediaId" in parsed && "mediaType" in parsed) {
      return parsed as SyncEventPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function passesSyncFilters(
  payload: SyncEventPayload,
  clientId: string,
  activeProfileId: string | null,
): boolean {
  if (payload.senderId && payload.senderId === clientId) {
    return false;
  }
  if (payload.profileId && activeProfileId && payload.profileId !== activeProfileId) {
    return false;
  }
  return true;
}