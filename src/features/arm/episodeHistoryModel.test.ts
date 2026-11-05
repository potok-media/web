import { describe, expect, it } from "vitest";
import type { MediaCard, TvEpisode } from "../../network/ApiTypes";
import {
  applyEpisodeWatchedState,
  isEpisodeWatched,
  toBulkEpisodeHistoryRequest,
  toEpisodeHistoryIdentity,
  toTitleWatchedBulkRequests,
} from "./episodeHistoryModel";

describe("ARM episode history identity", () => {
  it("keeps an ARM-only OVA actionable without inventing TMDB season coordinates", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      arm: {
        workId: "work-1",
        graphVersion: "graph-1",
      },
    };
    const episode: TvEpisode = {
      id: "episode-ova-1",
      name: "OVA",
      seasonNumber: 0,
      episodeNumber: 1,
      armEpisodeId: "episode-ova-1",
      armEntryId: "entry-ova",
      armNumber: 1,
    };

    expect(toEpisodeHistoryIdentity(media, episode)).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      episodeId: "episode-ova-1",
    });
  });

  it("keys ARM watched state by EpisodeId even when display placement is not a season", () => {
    const episode: TvEpisode = {
      id: "episode-ova-1",
      name: "OVA",
      seasonNumber: 0,
      episodeNumber: 1,
      armEpisodeId: "episode-ova-1",
      armEntryId: "entry-ova",
    };

    expect(isEpisodeWatched(episode, {
      episodeIds: ["episode-ova-1"],
      legacyCoordinates: [],
    })).toBe(true);
    expect(isEpisodeWatched(episode, {
      episodeIds: ["episode-1"],
      legacyCoordinates: [{ season: 1, number: 1 }],
    })).toBe(false);
  });

  it("builds an ARM bulk mutation from Potok identities without treating group display numbers as TMDB seasons", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      arm: {
        workId: "work-1",
        graphVersion: "graph-1",
      },
    };
    const episodes: TvEpisode[] = [
      {
        id: "episode-cour-1",
        name: "Cour episode",
        seasonNumber: 1,
        episodeNumber: 1,
        armEpisodeId: "episode-cour-1",
        armEntryId: "entry-cour-2",
        tmdbSeasonNumber: 3,
        tmdbEpisodeNumber: 7,
      },
      {
        id: "episode-ova-1",
        name: "OVA",
        seasonNumber: 1,
        episodeNumber: 2,
        armEpisodeId: "episode-ova-1",
        armEntryId: "entry-ova",
      },
    ];

    expect(toBulkEpisodeHistoryRequest(media, episodes, true)).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      changes: [
        {
          seasonNumber: 3,
          episodeNumber: 7,
          episodeId: "episode-cour-1",
          isWatched: true,
        },
        {
          episodeId: "episode-ova-1",
          isWatched: true,
        },
      ],
    });
  });

  it("applies an ARM-only watched mutation locally by EpisodeId without inventing legacy coordinates", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      progress: { completed: 0, aired: 1, percentage: 0, watchedEpisodes: [] },
    };
    const episode: TvEpisode = {
      id: "episode-ova-1",
      name: "OVA",
      seasonNumber: 1,
      episodeNumber: 1,
      armEpisodeId: "episode-ova-1",
      armEntryId: "entry-ova",
    };

    const watched = applyEpisodeWatchedState(media, [episode], true);
    expect(watched.progress?.watchedEpisodeIds).toEqual(["episode-ova-1"]);
    expect(watched.progress?.watchedEpisodes).toEqual([]);
    expect(isEpisodeWatched(episode, {
      episodeIds: watched.progress?.watchedEpisodeIds ?? [],
      legacyCoordinates: watched.progress?.watchedEpisodes ?? [],
    })).toBe(true);

    const removed = applyEpisodeWatchedState(watched, [episode], false);
    expect(removed.progress?.watchedEpisodeIds).toEqual([]);
  });

  it("counts ARM ids toward the completed total so the watched banner follows id-only rows", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      progress: { completed: 0, aired: 2, percentage: 0, watchedEpisodes: [] },
    };
    const episodes: TvEpisode[] = [
      {
        id: "episode-1",
        name: "One",
        seasonNumber: 1,
        episodeNumber: 1,
        armEpisodeId: "episode-1",
        armEntryId: "entry-1",
      },
      {
        id: "episode-2",
        name: "Two",
        seasonNumber: 1,
        episodeNumber: 2,
        armEpisodeId: "episode-2",
        armEntryId: "entry-1",
        tmdbSeasonNumber: 1,
        tmdbEpisodeNumber: 2,
      },
    ];

    const watched = applyEpisodeWatchedState(media, episodes, true);
    // Two ARM episodes; one also carries a TMDB coordinate — the count must not double it.
    expect(watched.progress?.completed).toBe(2);
  });

  it("builds a mark-all bulk request keyed by Potok identity with TMDB coordinates only as payload", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      arm: { workId: "work-1", graphVersion: "graph-1" },
    };
    const episodes: TvEpisode[] = [
      {
        id: "episode-1",
        name: "One",
        seasonNumber: 1,
        episodeNumber: 1,
        armEpisodeId: "episode-1",
        armEntryId: "entry-1",
        tmdbSeasonNumber: 1,
        tmdbEpisodeNumber: 1,
      },
      {
        id: "episode-2",
        name: "Two",
        seasonNumber: 1,
        episodeNumber: 2,
        armEpisodeId: "episode-2",
        armEntryId: "entry-1",
      },
      {
        id: 99,
        name: "Legacy only",
        seasonNumber: 2,
        episodeNumber: 1,
      },
    ];

    const requests = toTitleWatchedBulkRequests(media, episodes, true);
    expect(requests).toHaveLength(2);
    expect(requests[0]).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      changes: [
        { seasonNumber: 1, episodeNumber: 1, episodeId: "episode-1", isWatched: true },
        { episodeId: "episode-2", isWatched: true },
      ],
    });
    expect(requests[1]).toEqual({
      tmdbId: "777",
      mediaType: "tv",
      changes: [{ seasonNumber: 2, episodeNumber: 1, isWatched: true }],
    });
  });

  it("clears BOTH identity spaces on unmark-all so no stale row survives a reload", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      arm: { workId: "work-1", graphVersion: "graph-1" },
    };
    const episodes: TvEpisode[] = [
      {
        id: "episode-1",
        name: "One",
        seasonNumber: 1,
        episodeNumber: 1,
        armEpisodeId: "episode-1",
        armEntryId: "entry-1",
        tmdbSeasonNumber: 1,
        tmdbEpisodeNumber: 1,
      },
      {
        id: 99,
        name: "Legacy only",
        seasonNumber: 2,
        episodeNumber: 1,
      },
    ];

    const requests = toTitleWatchedBulkRequests(media, episodes, false);
    expect(requests).toHaveLength(2);
    // The projected ARM episode is deleted by Potok id AND by TMDB coordinate — rows written by
    // legacy clients would survive a Potok-keyed delete alone.
    expect(requests[0].changes).toEqual([
      { seasonNumber: 1, episodeNumber: 1, episodeId: "episode-1", isWatched: false },
    ]);
    expect(requests[1].changes).toEqual([
      { seasonNumber: 1, episodeNumber: 1, isWatched: false },
      { seasonNumber: 2, episodeNumber: 1, isWatched: false },
    ]);
  });
});
