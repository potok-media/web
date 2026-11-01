import { describe, expect, it } from "vitest";
import { isPlayableUrl } from "./playableUrl";

describe("isPlayableUrl", () => {
  it("accepts http(s) stream URLs", () => {
    expect(isPlayableUrl("https://cdn.test/episode.m3u8")).toBe(true);
    expect(isPlayableUrl("http://cdn.test/episode.mp4")).toBe(true);
    expect(isPlayableUrl("HTTPS://CDN.TEST/EPISODE.M3U8")).toBe(true);
  });

  it("rejects plugin-internal handles that are identifiers, not streams", () => {
    expect(isPlayableUrl("online-balancers://kodik/serial-4898")).toBe(false);
  });

  it("rejects empty and missing URLs", () => {
    expect(isPlayableUrl("")).toBe(false);
    expect(isPlayableUrl(undefined)).toBe(false);
    expect(isPlayableUrl(null)).toBe(false);
  });

  it("rejects non-URL values", () => {
    expect(isPlayableUrl(42)).toBe(false);
    expect(isPlayableUrl({})).toBe(false);
    expect(isPlayableUrl("ftp://cdn.test/file")).toBe(false);
  });
});
