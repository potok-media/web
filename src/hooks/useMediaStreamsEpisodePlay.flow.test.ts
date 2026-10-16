import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useMediaStreamsEpisodePlay inline stage flow", () => {
  it("opens every torrent in file inspection instead of auto-playing one-file releases", () => {
    const source = readFileSync(new URL("./useMediaStreamsEpisodePlay.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("const handleSelectStream"));
    const selectTorrent = handler.indexOf("mode: playbackMode");
    const requestFiles = handler.indexOf('"STREAM_SOURCE_GET_EPISODES"');

    expect(selectTorrent).toBeGreaterThan(-1);
    expect(requestFiles).toBeGreaterThan(-1);
    expect(selectTorrent).toBeLessThan(requestFiles);
    expect(handler).not.toContain("eps.length === 1");
  });

  it("moves the release into an explicit failed state when loading files fails", () => {
    const source = readFileSync(new URL("./useMediaStreamsEpisodePlay.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("const handleSelectStream"));

    expect(handler).toContain('type: "request-failed"');
    expect(handler).toContain("onError(error)");
  });
});
