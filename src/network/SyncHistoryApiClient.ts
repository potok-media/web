import type {
  ArmEpisodeId,
  ArmWorkId,
} from "./ArmTypes";
import type { LastSourcePayload } from "./ApiTypes";

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
}

export interface SaveProgressRequest extends HistoryIdentity {
  progressSeconds: number;
  durationSeconds: number;
  lastSource?: LastSourcePayload;
}

export type RemoveProgressRequest = HistoryIdentity;

export interface BulkProgressChange {
  seasonNumber?: number;
  episodeNumber?: number;
  isWatched: boolean;
  episodeId?: ArmEpisodeId;
}

export interface SaveBulkProgressRequest {
  tmdbId?: string;
  mediaType: string;
  workId?: ArmWorkId;
  changes: BulkProgressChange[];
}

/** Whole-title watch clear: every history row for the title, both identity spaces. */
export interface RemoveBulkProgressRequest {
  tmdbId?: string;
  mediaType: string;
  workId?: ArmWorkId;
}

export interface SyncHistoryHttpTransport {
  post<T>(path: string, body: unknown): Promise<T>;
}

export interface SyncHistoryApiClient {
  saveProgress(request: SaveProgressRequest): Promise<ProgressMutationResponse>;
  removeProgress(request: RemoveProgressRequest): Promise<ProgressMutationResponse>;
  saveBulkProgress(request: SaveBulkProgressRequest): Promise<BulkProgressMutationResponse>;
  removeBulkProgress(request: RemoveBulkProgressRequest): Promise<ProgressMutationResponse>;
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
    removeBulkProgress: (request) =>
      transport.post<ProgressMutationResponse>("/api/sync/history/bulk-remove", request),
  };
}
