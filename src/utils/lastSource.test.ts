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
});
