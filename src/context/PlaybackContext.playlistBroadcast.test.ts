import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("host → plugin playback events", () => {
  const contextSource = readFileSync(new URL("./PlaybackContext.tsx", import.meta.url), "utf8");
  const playerSource = readFileSync(new URL("../components/player/PlayerCore.tsx", import.meta.url), "utf8");
  const sdkSource = readFileSync(new URL("../sdk/src/index.ts", import.meta.url), "utf8");

  it("broadcasts PLAYLIST_ITEM_CHANGED with the active playlist item", () => {
    expect(contextSource).toContain('ExtensionRegistry.broadcast("PLAYLIST_ITEM_CHANGED"');
    expect(contextSource).toContain("episodeId: item.id ?? null");
    // Only playlist playbacks broadcast — movies/single streams have nothing to highlight.
    expect(contextSource).toContain("if (!activePlayback?.playlist?.length) return;");
    expect(contextSource).toContain("const item = getCurrentPlaylistItem(activePlayback);");
  });

  it("broadcasts PLAYBACK_STARTED on open and PLAYBACK_STOPPED on close exactly once per transition", () => {
    expect(contextSource).toContain('ExtensionRegistry.broadcast("PLAYBACK_STARTED"');
    expect(contextSource).toContain('ExtensionRegistry.broadcast("PLAYBACK_STOPPED"');
    // Edge-triggered via a ref — descriptor updates (episode switches, enrich) must not re-fire STARTED.
    expect(contextSource).toContain("hadPlaybackRef");
  });

  it("broadcasts PLAYBACK_ERROR when the player hits a fatal error", () => {
    expect(playerSource).toContain('ExtensionRegistry.broadcast("PLAYBACK_ERROR"');
    expect(playerSource).toContain("message: vm.playerError");
  });

  it("SDK dispatches all playback events to typed subscribers", () => {
    expect(sdkSource).toContain("msg.action === 'PLAYLIST_ITEM_CHANGED'");
    expect(sdkSource).toContain("msg.action === 'PLAYBACK_STARTED'");
    expect(sdkSource).toContain("msg.action === 'PLAYBACK_STOPPED'");
    expect(sdkSource).toContain("msg.action === 'PLAYBACK_ERROR'");
    expect(sdkSource).toContain("onPlaylistItemChange:");
    expect(sdkSource).toContain("onPlaybackStarted:");
    expect(sdkSource).toContain("onPlaybackStopped:");
    expect(sdkSource).toContain("onPlaybackError:");
    expect(sdkSource).toContain("PotokPlaybackEventListeners");
  });

  it("co-watch back closes an inline player instead of navigating away", () => {
    const topBarSource = readFileSync(
      new URL("../components/watchTogether/WatchTogetherTopBarRoom.tsx", import.meta.url),
      "utf8",
    );
    // Inline player: leave the room, stop the playback, do NOT navigate —
    // navigating would unregister the workspace portal and orphan the player fullscreen.
    expect(topBarSource).toContain("isInlinePlayer");
    const inlineStart = topBarSource.indexOf("if (isInlinePlayer)");
    const legacyStart = topBarSource.indexOf("leaveCoWatchSession({");
    expect(inlineStart).toBeGreaterThan(-1);
    expect(legacyStart).toBeGreaterThan(inlineStart);
    const inlineBranch = topBarSource.slice(inlineStart, legacyStart);
    expect(inlineBranch).toContain("stopVideo();");
    expect(inlineBranch).not.toContain("navigate(-1)");
    const legacyBranch = topBarSource.slice(legacyStart);
    expect(legacyBranch).toContain("navigate(-1)");
  });

  it("global back handler closes an open player before navigating", () => {
    const backSource = readFileSync(new URL("../hooks/useAppLayoutBackNavigation.ts", import.meta.url), "utf8");
    const playbackStart = backSource.indexOf("if (activePlayback) {");
    const homeStart = backSource.indexOf('location.pathname === "/"');
    expect(playbackStart).toBeGreaterThan(-1);
    expect(homeStart).toBeGreaterThan(playbackStart);
    const playbackBranch = backSource.slice(playbackStart, homeStart);
    expect(playbackBranch).toContain("stopVideo();");
    expect(playbackBranch).not.toContain("navigate(-1)");
  });
});
