import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("player mount ownership", () => {
  it("keeps the overlay player the only body portal and gives each mount its own settings namespace", () => {
    const context = readFileSync(
      new URL("../../context/PlaybackContext.tsx", import.meta.url),
      "utf8",
    );
    const overlay = readFileSync(
      new URL("../appLayout/AppLayoutPlayerOverlay.tsx", import.meta.url),
      "utf8",
    );
    const core = readFileSync(new URL("./PlayerCore.tsx", import.meta.url), "utf8");
    const inline = readFileSync(new URL("./InlinePlayer.tsx", import.meta.url), "utf8");
    const overlayPlayer = readFileSync(new URL("./OverlayPlayer.tsx", import.meta.url), "utf8");
    const utilityControls = readFileSync(
      new URL("./PlayerUtilityControls.tsx", import.meta.url),
      "utf8",
    );

    // The portal registry is gone: mount routing lives on the playback descriptor.
    expect(context).not.toContain("playerPortalTarget");
    expect(context).not.toContain("registerPlayerPortalTarget");
    expect(context).toContain('mount: playback.mount === "inline" ? "inline" : "overlay"');

    // AppLayout lifts the overlay player only for overlay playbacks.
    expect(overlay).toContain('activePlayback.mount === "overlay"');
    expect(overlay).toContain("<OverlayPlayer");

    // OverlayPlayer is the single component allowed to portal into document.body; InlinePlayer
    // embeds directly and keeps the potok_inline_* settings namespace.
    expect(overlayPlayer).toContain("createPortal(");
    expect(overlayPlayer).toContain("document.body");
    expect(overlayPlayer).not.toContain("potok_inline");
    expect(inline).not.toContain("createPortal");
    expect(inline).toContain('mount="inline"');
    expect(inline).toContain('volumeStorageKeyPrefix="potok_inline"');

    // Shared chrome variants stay driven by the mount prop.
    expect(core).toContain("web-player-overlay--inline");
    expect(core).toContain("showPlaylistSelector={!isInline || vm.isFullscreen}");
    expect(core).toContain("coWatchInRail={isInline}");
    expect(core).not.toContain("PlayerCoWatchChat");
    expect(core).not.toContain("web-player-overlay--chat-open");
    expect(utilityControls).toContain("showPlaylistSelector && playlistItems.length > 0");
    expect(utilityControls).toContain("if (coWatchInRail && isFullscreen)");
  });
});
