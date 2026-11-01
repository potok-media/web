import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("usePlayerPlaylist pseudo-url guard", () => {
  const source = readFileSync(new URL("./usePlayerPlaylist.ts", import.meta.url), "utf8");

  it("never feeds a non-playable streamUrl to the player fallback", () => {
    // The guard must sit between the resolver attempt and the fallback playVideo call.
    const guardAt = source.indexOf("if (!isPlayableUrl(item.streamUrl))");
    const fallbackAt = source.indexOf("playVideo(fallbackPlayback)");
    expect(guardAt).toBeGreaterThan(-1);
    expect(fallbackAt).toBeGreaterThan(guardAt);
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
