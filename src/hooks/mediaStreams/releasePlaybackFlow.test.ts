import { describe, expect, it } from "vitest";
import type { RawStreamPayload } from "@potok/sdk-types";
import type { EpisodeSelectorData } from "./mediaStreamsTypes";
import {
  initialReleasePlaybackState,
  releasePlaybackModeFor,
  releasePlaybackReducer,
  validateReleasePlayback,
} from "./releasePlaybackFlow";

const release = { title: "Release", kind: "torrent" } as RawStreamPayload;
const selector = (overrides: Partial<EpisodeSelectorData> = {}): EpisodeSelectorData => ({
  title: "Files",
  episodes: [{ id: "file-1", season: 1, episode: 1, audios: [] }],
  tmdbSeasonsCount: 1,
  ...overrides,
});

describe("release playback flow", () => {
  it("treats only explicit movie HLS/MP4 sources as direct playback", () => {
    expect(releasePlaybackModeFor("movie", { title: "HLS", kind: "hls" } as RawStreamPayload)).toBe("direct");
    expect(releasePlaybackModeFor("movie", { title: "MP4", kind: "mp4" } as RawStreamPayload)).toBe("direct");
    expect(releasePlaybackModeFor("movie", { title: "Unknown" } as RawStreamPayload)).toBe("files");
    expect(releasePlaybackModeFor("movie", release)).toBe("files");
    expect(releasePlaybackModeFor("tv", { title: "HLS", kind: "hls" } as RawStreamPayload)).toBe("files");
  });

  it("keeps a selected torrent in inspection until its files are available", () => {
    const inspecting = releasePlaybackReducer(initialReleasePlaybackState, {
      type: "release-selected",
      release,
      mode: "files",
    });

    expect(inspecting.phase).toBe("inspecting");
    expect(inspecting.mode).toBe("files");
    expect(inspecting.release).toBe(release);
  });

  it("blocks the whole TV release when one file is unresolved", () => {
    const data = selector({
      episodes: [
        { id: "file-1", resolutionState: "resolved", episodeId: "episode-1", audios: [] },
        { id: "file-2", resolutionState: "unresolved", audios: [] },
      ],
    });
    const validation = validateReleasePlayback({
      mediaType: "tv",
      selectorData: data,
      canonicalBindingEnabled: true,
    });

    expect(validation).toEqual({ blocked: true, issueCount: 1 });
  });

  it("allows a TV release only after every canonical file is resolved", () => {
    const data = selector({
      arm: { state: "resolved", workId: "work-1" },
      episodes: [
        { id: "file-1", resolutionState: "resolved", episodeId: "episode-1", audios: [] },
        { id: "file-2", resolutionState: "resolved", episodeId: "episode-2", audios: [] },
      ],
    });
    const validation = validateReleasePlayback({
      mediaType: "tv",
      selectorData: data,
      canonicalBindingEnabled: true,
    });

    expect(validation).toEqual({ blocked: false, issueCount: 0 });
  });

  it("does not infer a movie file from the release name", () => {
    const validation = validateReleasePlayback({
      mediaType: "movie",
      selectorData: selector({ parsingSuspect: true }),
      canonicalBindingEnabled: true,
    });

    expect(validation).toEqual({ blocked: false, issueCount: 0 });
  });

  it("refuses a playback transition while the release is blocked", () => {
    const blocked = {
      ...initialReleasePlaybackState,
      phase: "blocked" as const,
      mode: "files" as const,
      release,
      selectorData: selector(),
      validation: { blocked: true, issueCount: 1 },
    };

    expect(releasePlaybackReducer(blocked, { type: "playback-requested", episodeId: "file-1" }))
      .toBe(blocked);
  });

  it("returns to the validated file list after the player closes", () => {
    const playing = {
      ...initialReleasePlaybackState,
      phase: "playing" as const,
      mode: "files" as const,
      release,
      selectorData: selector(),
    };

    expect(releasePlaybackReducer(playing, { type: "player-closed" }).phase).toBe("ready");
  });
});
