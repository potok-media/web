import { describe, expect, it } from "vitest";
import { buildLastSource, LAST_SOURCE_MAX_BYTES } from "./lastSource";

describe("buildLastSource", () => {
  it("returns undefined when nothing is known about the source", () => {
    expect(buildLastSource({})).toBeUndefined();
    expect(buildLastSource({ providerId: "", voice: undefined })).toBeUndefined();
  });

  it("omits undefined fields and keeps the defined ones", () => {
    expect(
      buildLastSource({ providerId: "potok-torrents", streamHash: "ABC", fileIndex: 3 }),
    ).toEqual({ providerId: "potok-torrents", streamHash: "ABC", fileIndex: "3" });
  });

  it("stringifies numeric fileIndex and keeps voice", () => {
    expect(buildLastSource({ fileIndex: 0, voice: "Оригинал" })).toEqual({
      fileIndex: "0",
      voice: "Оригинал",
    });
  });

  it("skips empty fileIndex values", () => {
    expect(buildLastSource({ fileIndex: "" })?.fileIndex).toBeUndefined();
  });

  it("passes the sourceStream through verbatim", () => {
    const sourceStream = { id: "serial-1", voice: "Kodik" };
    expect(buildLastSource({ providerId: "potok-online", sourceStream })?.sourceStream).toBe(
      sourceStream,
    );
  });

  it("drops an oversized sourceStream but keeps identity fields", () => {
    const huge = { blob: "x".repeat(LAST_SOURCE_MAX_BYTES + 1) };
    const result = buildLastSource({ providerId: "potok-torrents", streamHash: "ABC", sourceStream: huge });
    expect(result).toEqual({ providerId: "potok-torrents", streamHash: "ABC" });
  });

  it("drops an unserializable sourceStream instead of throwing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = buildLastSource({ providerId: "p", sourceStream: circular });
    expect(result).toEqual({ providerId: "p" });
  });

  it("persists voice candidates with urls stripped and metadata kept", () => {
    const result = buildLastSource({
      providerId: "potok-online-balancers",
      audios: [
        { name: "AniDUB · 1080p · Kodik", label: "AniDUB · 1080p · Kodik", voice: "AniDUB", providerId: "kodik", sourceId: "43", query: { id: "43" }, url: "https://cdn.test/a.m3u8" },
        { name: "AniLiberty", voice: "AniLiberty", providerId: "aniliberty", url: "" },
      ],
    });
    expect(result?.audios).toEqual([
      { name: "AniDUB · 1080p · Kodik", label: "AniDUB · 1080p · Kodik", voice: "AniDUB", providerId: "kodik", sourceId: "43", query: { id: "43" } },
      { name: "AniLiberty", voice: "AniLiberty", providerId: "aniliberty" },
    ]);
  });

  it("skips unusable audio entries and omits audios when nothing remains", () => {
    expect(buildLastSource({ providerId: "p", audios: "not-an-array" })?.audios).toBeUndefined();
    expect(buildLastSource({ providerId: "p", audios: [null, { url: "x" }, "str"] })?.audios).toBeUndefined();
  });

  it("trims candidate query first, then label, when the payload exceeds the cap", () => {
    const bigQuery = "q".repeat(LAST_SOURCE_MAX_BYTES / 2);
    const bigLabel = "l".repeat(LAST_SOURCE_MAX_BYTES / 2);
    const result = buildLastSource({
      providerId: "potok-online-balancers",
      sourceStream: { id: "serial-1" },
      audios: [
        { name: "Dub A", label: bigLabel, voice: "Dub A", query: bigQuery },
        { name: "Dub B", label: "B", voice: "Dub B" },
      ],
    });
    // queries dropped first — that alone must be enough to fit.
    expect(result?.audios?.every((a) => a.query === undefined)).toBe(true);
    expect(result?.audios?.[0]?.label).toBe(bigLabel);
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(LAST_SOURCE_MAX_BYTES);
  });

  it("drops labels and then the whole audios list when still over budget", () => {
    const hugeLabel = "x".repeat(LAST_SOURCE_MAX_BYTES);
    const withLabelsDropped = buildLastSource({
      providerId: "potok-online-balancers",
      audios: [{ name: "Dub A", label: hugeLabel, voice: "Dub A" }],
    });
    expect(withLabelsDropped?.audios?.[0]).toEqual({ name: "Dub A", voice: "Dub A" });

    const withAudiosDropped = buildLastSource({
      providerId: "potok-online-balancers",
      audios: [{ name: "N".repeat(LAST_SOURCE_MAX_BYTES), voice: "v" }],
    });
    expect(withAudiosDropped?.audios).toBeUndefined();
    expect(withAudiosDropped?.providerId).toBe("potok-online-balancers");
  });
});
