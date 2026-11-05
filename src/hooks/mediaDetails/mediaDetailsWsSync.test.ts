import { describe, expect, it } from "vitest";
import { applyMediaWsSyncEvent } from "./mediaDetailsWsSync";
import type { MediaCard } from "../../network/ApiTypes";

const baseMedia: MediaCard = {
  id: 777,
  title: "Example",
  mediaType: "tv",
  progress: {
    completed: 0,
    aired: 10,
    percentage: 0,
    watchedEpisodes: [],
    watchedEpisodeIds: [],
  },
};

function setup(media: MediaCard) {
  const mediaRef = { current: media };
  const watchedLog: boolean[] = [];
  const setters = {
    setMedia: (value: MediaCard) => {
      mediaRef.current = value;
    },
    setIsWatched: (value: boolean) => watchedLog.push(value),
    setInWatchlist: () => {},
    setIsFavorite: () => {},
  };
  return { mediaRef, setters, watchedLog };
}

describe("applyMediaWsSyncEvent", () => {
  it("treats a title-level history event as the whole-title state instead of recomputing from episodes", () => {
    const { mediaRef, setters, watchedLog } = setup(baseMedia);

    applyMediaWsSyncEvent(
      "sync:history:changed",
      { mediaId: 777, mediaType: "tv", isWatched: true },
      "tv",
      mediaRef,
      setters,
    );

    expect(watchedLog).toEqual([true]);
  });

  it("recomputes the watched state from episode lists for episode-scoped events", () => {
    const partiallyWatched: MediaCard = {
      ...baseMedia,
      progress: {
        ...baseMedia.progress!,
        completed: 1,
        watchedEpisodes: [{ season: 1, number: 1 }],
      },
    };
    const { mediaRef, setters, watchedLog } = setup(partiallyWatched);

    applyMediaWsSyncEvent(
      "sync:history:changed",
      { mediaId: 777, mediaType: "tv", seasonNumber: 1, episodeNumber: 2, isWatched: true },
      "tv",
      mediaRef,
      setters,
    );

    // 2 of 10 aired — still unwatched as a title.
    expect(watchedLog).toEqual([false]);
    expect(mediaRef.current.progress?.watchedEpisodes).toEqual([
      { season: 1, number: 1 },
      { season: 1, number: 2 },
    ]);
  });

  it("counts ARM episode ids toward the completed total on batch events", () => {
    const { mediaRef, setters, watchedLog } = setup(baseMedia);

    applyMediaWsSyncEvent(
      "sync:history:batch_changed",
      {
        mediaId: 777,
        mediaType: "tv",
        changes: [
          { episodeId: "episode-1", isWatched: true },
          { episodeId: "episode-2", isWatched: true },
        ],
      },
      "tv",
      mediaRef,
      setters,
    );

    expect(mediaRef.current.progress?.watchedEpisodeIds).toEqual(["episode-1", "episode-2"]);
    expect(mediaRef.current.progress?.completed).toBe(2);
    expect(watchedLog).toEqual([false]);
  });
});
