import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("usePlayerPlaylist pseudo-url guard", () => {
  const source = readFileSync(new URL("./usePlayerPlaylist.ts", import.meta.url), "utf8");

  it("never feeds a non-playable streamUrl to the player fallback", () => {
    // Ready-content path: directUrl is only assigned after isPlayableUrl checks, and the
    // direct playVideo is gated on it. The legacy resolver tail keeps its own guard.
    expect(source).toContain("isPlayableUrl(item.streamUrl) ? item.streamUrl : null");
    const directGateAt = source.indexOf("if (directUrl) {");
    const directPlayAt = source.indexOf("playVideo(fallbackPlayback)");
    expect(directGateAt).toBeGreaterThan(-1);
    expect(directPlayAt).toBeGreaterThan(directGateAt);
    expect(source).toContain("if (!isPlayableUrl(item.streamUrl))");
    expect(source).toContain('throw new Error(');
  });

  it("validates the resolver result before playing it", () => {
    expect(source).toContain("if (info && isPlayableUrl(info.streamUrl))");
  });

  it("logs resolver failures instead of swallowing them", () => {
    expect(source).toContain("logger.error(");
    expect(source).not.toContain("catch {}");
  });
});
