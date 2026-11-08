import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("usePlayerPlaylist R1 launch contract", () => {
  const source = readFileSync(new URL("./usePlayerPlaylist.ts", import.meta.url), "utf8");

  it("never resolves: no sandbox request, no resolver import", () => {
    expect(source).not.toContain("resolvePlaylistItem");
    expect(source).not.toContain("ExtensionRegistry");
    expect(source).not.toContain("sendSandboxRequest");
  });

  it("launches only playable urls and throws a clear error otherwise", () => {
    expect(source).toContain("isPlayableUrl(item.streamUrl) ? item.streamUrl : null");
    expect(source).toContain("the playlist item has no playable stream URL");
    expect(source).toContain("throw new Error(");
    const throwAt = source.indexOf("throw new Error(");
    const playAt = source.indexOf("playVideo(nextPlayback)");
    expect(playAt).toBeGreaterThan(throwAt);
  });

  it("picks the remembered voice locally from the item's own audios", () => {
    expect(source).toContain("getPreferredVoice");
    expect(source).toContain("item.audios");
    expect(source).toContain("norm(audio.voice) === wantedVoice || norm(audio.name) === wantedVoice");
  });

  it("switches episodes immutably: replaces only the target playlist index", () => {
    expect(source).toContain("playlist: playback.playlist.map((entry, entryIndex) =>");
    expect(source).toContain("entryIndex === index ? nextItem : entry");
    expect(source).toContain("playlistIndex: index");
    // The previous episode's segment metadata must not leak into the next one.
    expect(source).toContain("introStart: undefined");
  });
});
