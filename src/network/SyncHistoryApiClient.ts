import type {
  ArmEpisodeGroupId,
  ArmEpisodeId,
  ArmOrderingId,
  ArmWorkId,
} from "./ArmTypes";

export type TraktSyncState =
  | "notRequested"
  | "notApplicable"
  | "synced"
  | "pending"
  | "unsyncable"
  | "notConnected"
  | "providerError";

export interface TraktSyncResult {
  state: TraktSyncState;
  code?: string | null;
}

export interface ProgressMutationResponse {
  success: boolean;
  isCompleted: boolean;
  traktSync: TraktSyncResult;
}

export interface BulkTraktSyncResult {
  episodeId?: ArmEpisodeId | null;
  result: TraktSyncResult;
}

export interface BulkProgressMutationResponse {
  success: boolean;
  traktSync: BulkTraktSyncResult[];
}

export interface HistoryIdentity {
  tmdbId?: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  workId?: ArmWorkId;
  episodeId?: ArmEpisodeId;
  orderingId?: ArmOrderingId;
  groupId?: ArmEpisodeGroupId;
}

export interface SaveProgressRequest extends HistoryIdentity {
  progressSeconds: number;
  durationSeconds: number;
  syncTrakt?: boolean;
}

export interface RemoveProgressRequest extends HistoryIdentity {
  syncTrakt?: boolean;
}

export interface BulkProgressChange {
  seasonNumber?: number;
  episodeNumber?: number;
  isWatched: boolean;
  episodeId?: ArmEpisodeId;
  groupId?: ArmEpisodeGroupId;
}

export interface SaveBulkProgressRequest {
  tmdbId?: string;
  mediaType: string;
  workId?: ArmWorkId;
  orderingId?: ArmOrderingId;
  changes: BulkProgressChange[];
  syncTrakt?: boolean;
}

export interface SyncHistoryHttpTransport {
  post<T>(path: string, body: unknown): Promise<T>;
}

export interface SyncHistoryApiClient {
  saveProgress(request: SaveProgressRequest): Promise<ProgressMutationResponse>;
  removeProgress(request: RemoveProgressRequest): Promise<ProgressMutationResponse>;
  saveBulkProgress(request: SaveBulkProgressRequest): Promise<BulkProgressMutationResponse>;
}

export function createSyncHistoryApiClient(
  transport: SyncHistoryHttpTransport,
): SyncHistoryApiClient {
  return {
    saveProgress: (request) =>
      transport.post<ProgressMutationResponse>("/api/sync/history/progress", request),
    removeProgress: (request) =>
      transport.post<ProgressMutationResponse>("/api/sync/history/remove", request),
    saveBulkProgress: (request) =>
      transport.post<BulkProgressMutationResponse>("/api/sync/history/bulk-progress", request),
  };
}
