import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useMediaStreamsEpisodePlay inline stage flow", () => {
  it("opens the selected torrent stage before requesting its files", () => {
    const source = readFileSync(new URL("./useMediaStreamsEpisodePlay.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("const handleSelectStream"));
    const selectTorrent = handler.indexOf("setClickedStream(stream)");
    const requestFiles = handler.indexOf('"STREAM_SOURCE_GET_EPISODES"');

    expect(selectTorrent).toBeGreaterThan(-1);
    expect(requestFiles).toBeGreaterThan(-1);
    expect(selectTorrent).toBeLessThan(requestFiles);
  });

  it("returns to torrents when loading files fails", () => {
    const source = readFileSync(new URL("./useMediaStreamsEpisodePlay.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("const handleSelectStream"));

    expect(handler).toContain("setEpisodeSelectorData(null)");
    expect(handler).toContain("setClickedStream(null)");
    expect(handler).toContain("onError(error)");
  });
});
