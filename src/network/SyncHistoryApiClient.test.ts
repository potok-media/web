import { describe, expect, it } from "vitest";
import {
  createSyncHistoryApiClient,
  type SyncHistoryHttpTransport,
} from "./SyncHistoryApiClient";

describe("sync history client", () => {
  it("sends canonical episode identity and returns typed pending Trakt state as local success", async () => {
    const requests: { path: string; body: unknown }[] = [];
    const transport: SyncHistoryHttpTransport = {
      async post<T>(path: string, body: unknown): Promise<T> {
        requests.push({ path, body });
        return {
          success: true,
          isCompleted: true,
          traktSync: { state: "pending", code: "PROJECTION_UNRESOLVED" },
        } as T;
      },
    };
    const client = createSyncHistoryApiClient(transport);

    const result = await client.saveProgress({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      episodeId: "episode-ova-1",
      orderingId: "ordering-default",
      groupId: "group-ova",
      progressSeconds: 100,
      durationSeconds: 100,
      syncTrakt: true,
    });

    expect(requests).toEqual([{
      path: "/api/sync/history/progress",
      body: {
        tmdbId: "777",
        mediaType: "episode",
        workId: "work-1",
        episodeId: "episode-ova-1",
        orderingId: "ordering-default",
        groupId: "group-ova",
        progressSeconds: 100,
        durationSeconds: 100,
        syncTrakt: true,
      },
    }]);
    expect(result).toEqual({
      success: true,
      isCompleted: true,
      traktSync: { state: "pending", code: "PROJECTION_UNRESOLVED" },
    });
  });

  it("removes an ARM episode by canonical identity", async () => {
    const requests: { path: string; body: unknown }[] = [];
    const client = createSyncHistoryApiClient({
      async post<T>(path: string, body: unknown): Promise<T> {
        requests.push({ path, body });
        return {
          success: true,
          isCompleted: false,
          traktSync: { state: "synced" },
        } as T;
      },
    });

    await client.removeProgress({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      episodeId: "episode-ova-1",
      orderingId: "ordering-default",
      groupId: "group-ova",
      syncTrakt: true,
    });

    expect(requests).toEqual([{
      path: "/api/sync/history/remove",
      body: {
        tmdbId: "777",
        mediaType: "episode",
        workId: "work-1",
        episodeId: "episode-ova-1",
        orderingId: "ordering-default",
        groupId: "group-ova",
        syncTrakt: true,
      },
    }]);
  });

  it("sends ordering once and EpisodeId/GroupId for every ARM bulk change", async () => {
    const requests: { path: string; body: unknown }[] = [];
    const client = createSyncHistoryApiClient({
      async post<T>(path: string, body: unknown): Promise<T> {
        requests.push({ path, body });
        return { success: true, traktSync: [] } as T;
      },
    });

    await client.saveBulkProgress({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      orderingId: "ordering-default",
      changes: [{
        episodeId: "episode-ova-1",
        groupId: "group-ova",
        isWatched: true,
      }],
      syncTrakt: true,
    });

    expect(requests).toEqual([{
      path: "/api/sync/history/bulk-progress",
      body: {
        tmdbId: "777",
        mediaType: "episode",
        workId: "work-1",
        orderingId: "ordering-default",
        changes: [{
          episodeId: "episode-ova-1",
          groupId: "group-ova",
          isWatched: true,
        }],
        syncTrakt: true,
      },
    }]);
  });
});
