import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("WebMediaPlayer portal ownership", () => {
  it("keeps solo and co-watch playback in the registered page workspace", () => {
    const context = readFileSync(
      new URL("../context/PlaybackContext.tsx", import.meta.url),
      "utf8",
    );
    const overlay = readFileSync(
      new URL("./appLayout/AppLayoutPlayerOverlay.tsx", import.meta.url),
      "utf8",
    );
    const player = readFileSync(new URL("./WebMediaPlayer.tsx", import.meta.url), "utf8");
    const utilityControls = readFileSync(
      new URL("./player/PlayerUtilityControls.tsx", import.meta.url),
      "utf8",
    );

    expect(context).toContain("playerPortalTarget");
    expect(context).toContain("registerPlayerPortalTarget");
    expect(overlay).toContain("portalTarget={playerPortalTarget}");
    expect(overlay).not.toContain("activePlayback.coWatch ? null : playerPortalTarget");
    expect(player).toContain("portalTarget ?? document.body");
    expect(player).toContain("web-player-overlay--inline");
    expect(player).toContain("showPlaylistSelector={!isInline || vm.isFullscreen}");
    expect(player).toContain("coWatchInRail={isInline}");
    expect(player).toContain("!isInline && <PlayerCoWatchChat />");
    expect(utilityControls).toContain("showPlaylistSelector && playlistItems.length > 0");
    expect(utilityControls).toContain("if (coWatchInRail) {");
  });
});
