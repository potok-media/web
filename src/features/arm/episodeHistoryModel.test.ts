import { describe, expect, it } from "vitest";
import type { MediaCard, TvEpisode } from "../../network/ApiTypes";
import {
  applyEpisodeWatchedState,
  isEpisodeWatched,
  toBulkEpisodeHistoryRequest,
  toEpisodeHistoryIdentity,
} from "./episodeHistoryModel";

describe("ARM episode history identity", () => {
  it("keeps an ARM-only OVA actionable without inventing TMDB season coordinates", () => {
    const media: MediaCard = {
      id: 777,
      title: "Example",
      mediaType: "tv",
      arm: {
        workId: "work-1",
        defaultOrderingId: "ordering-default",
        graphVersion: "graph-1",
        resolutionState: "resolved",
        coverageState: "partial",
      },
    };
    const episode: TvEpisode = {
      id: "episode-ova-1",
      name: "OVA",
      seasonNumber: 0,
      episodeNumber: 1,
      armEpisodeId: "episode-ova-1",
      armOrderingId: "ordering-default",
      armGroupId: "group-ova",
      armOrdinal: "OVA 1",
    };

    expect(toEpisodeHistoryIdentity(media, episode)).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      episodeId: "episode-ova-1",
      orderingId: "ordering-default",
      groupId: "group-ova",
    });
  });

  it("keys ARM watched state by EpisodeId even when display placement is not a season", () => {
    const episode: TvEpisode = {
      id: "episode-ova-1",
      name: "OVA",
      seasonNumber: 0,
      episodeNumber: 1,
      armEpisodeId: "episode-ova-1",
      armGroupId: "group-ova",
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
        defaultOrderingId: "ordering-default",
        graphVersion: "graph-1",
        resolutionState: "resolved",
        coverageState: "partial",
      },
    };
    const episodes: TvEpisode[] = [
      {
        id: "episode-cour-1",
        name: "Cour episode",
        seasonNumber: 1,
        episodeNumber: 1,
        armEpisodeId: "episode-cour-1",
        armOrderingId: "ordering-default",
        armGroupId: "group-cour-2",
        tmdbSeasonNumber: 3,
        tmdbEpisodeNumber: 7,
      },
      {
        id: "episode-ova-1",
        name: "OVA",
        seasonNumber: 1,
        episodeNumber: 2,
        armEpisodeId: "episode-ova-1",
        armOrderingId: "ordering-default",
        armGroupId: "group-ova",
      },
    ];

    expect(toBulkEpisodeHistoryRequest(media, episodes, true)).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      orderingId: "ordering-default",
      changes: [
        {
          seasonNumber: 3,
          episodeNumber: 7,
          episodeId: "episode-cour-1",
          groupId: "group-cour-2",
          isWatched: true,
        },
        {
          episodeId: "episode-ova-1",
          groupId: "group-ova",
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
      armGroupId: "group-ova",
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
});
