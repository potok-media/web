import { describe, expect, it } from "vitest";
import { buildEpisodePlaylist } from "./episodePlaylist";

describe("buildEpisodePlaylist", () => {
  it("keeps the whole playable release in source order", () => {
    const playlist = buildEpisodePlaylist([
      {
        id: "file-1",
        season: 2,
        episode: 1,
        title: "Ну что, в путь?",
        url: "https://media.test/01.m3u8",
        audios: [],
      },
      {
        id: "file-2",
        fileName: "Sousou_no_Frieren_[02].mkv",
        audios: [{ id: "audio-main", name: "Основной", url: "https://media.test/02.mp4" }],
      },
      {
        id: "file-3",
        fileName: "Sousou_no_Frieren_[03].mkv",
        audios: [],
      },
    ], {
      fallbackEpisodeTitle: (episode) => `Серия ${episode}`,
      unresolvedTitle: "Неопознанный файл",
      mainStreamTitle: "Основной поток",
    });

    expect(playlist).toHaveLength(3);
    expect(playlist.map((item) => item.id)).toEqual(["file-1", "file-2", "file-3"]);
    expect(playlist[0]).toMatchObject({
      title: "Ну что, в путь?",
      streamUrl: "https://media.test/01.m3u8",
      streamType: "m3u8",
      season: 2,
      episode: 1,
    });
    expect(playlist[1]).toMatchObject({
      title: "Sousou_no_Frieren_[02].mkv",
      streamUrl: "https://media.test/02.mp4",
      streamType: "mp4",
      voice: "Основной",
    });
    expect(playlist[2]).toMatchObject({
      title: "Sousou_no_Frieren_[03].mkv",
      streamUrl: "",
      streamType: undefined,
    });
  });
});
