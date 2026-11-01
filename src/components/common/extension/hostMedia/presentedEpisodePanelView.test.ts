import { describe, expect, it } from "vitest";
import { resolvePresentedEpisodePanelView } from "./presentedEpisodePanelView";
import type { GenericEpisodeItem } from "../../episodeSelector/types";

const episodes: GenericEpisodeItem[] = [
  { id: "episode-1", title: "Серия 1", audios: [] },
  { id: "episode-2", title: "Серия 2", audios: [] },
  { id: "episode-3", title: "Серия 3", audios: [] },
];

describe("resolvePresentedEpisodePanelView", () => {
  it("keeps the presented order and no highlight without playback", () => {
    const view = resolvePresentedEpisodePanelView({ episodes }, null);

    expect(view.episodes.map((episode) => episode.id)).toEqual(["episode-1", "episode-2", "episode-3"]);
    expect(view.activeEpisodeId).toBeUndefined();
  });

  it("takes the display order and the highlight from the playback playlist", () => {
    const view = resolvePresentedEpisodePanelView(
      { episodes },
      { playlist: [{ id: "episode-2" }, { id: "episode-1" }], playlistIndex: 0 },
    );

    expect(view.episodes.map((episode) => episode.id)).toEqual(["episode-2", "episode-1", "episode-3"]);
    expect(view.activeEpisodeId).toBe("episode-2");
  });

  it("follows playlistIndex moves without any plugin-side sync event", () => {
    const playback = { playlist: [{ id: "episode-1" }, { id: "episode-2" }], playlistIndex: 1 };

    expect(resolvePresentedEpisodePanelView({ episodes }, playback).activeEpisodeId).toBe("episode-2");

    playback.playlistIndex = 0;
    expect(resolvePresentedEpisodePanelView({ episodes }, playback).activeEpisodeId).toBe("episode-1");
  });

  it("keeps unknown playlist ids out of the highlight", () => {
    const view = resolvePresentedEpisodePanelView(
      { episodes },
      { playlist: [{ id: "episode-9" }], playlistIndex: 0 },
    );

    expect(view.episodes.map((episode) => episode.id)).toEqual(["episode-1", "episode-2", "episode-3"]);
    expect(view.activeEpisodeId).toBe("episode-9");
  });

  it("ignores an out-of-range playlist index", () => {
    const view = resolvePresentedEpisodePanelView(
      { episodes },
      { playlist: [{ id: "episode-1" }], playlistIndex: 5 },
    );

    expect(view.activeEpisodeId).toBeUndefined();
  });
});
