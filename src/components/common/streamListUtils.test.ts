import { describe, expect, it } from "vitest";
import {
  findStreamByIdentity,
  getStreamHash,
  isSameStream,
  mapStreamToUI,
  mergePinStream,
  type ExtendedStreamPayload,
} from "./streamListUtils";

const t = (key: string) => key;

describe("stream identity", () => {
  it("matches by lowercase hash and falls back to magnet/url", () => {
    expect(getStreamHash({ title: "A", hash: "AbC" })).toBe("abc");
    expect(
      isSameStream({ title: "A", hash: "abc" }, { title: "B", hash: "ABC" }),
    ).toBe(true);
    expect(
      findStreamByIdentity(
        [{ title: "live", hash: "abc", seeders: 9 }],
        { title: "stored", hash: "ABC" },
      )?.seeders,
    ).toBe(9);
    expect(
      findStreamByIdentity(
        [{ title: "live", magnet: "magnet:?xt=1" }],
        { title: "stored", magnet: "magnet:?xt=1" },
      )?.title,
    ).toBe("live");
  });

  it("keeps the stored override when live search omits it", () => {
    const stored: ExtendedStreamPayload = {
      title: "Release",
      hash: "abc",
      override: { seasonCount: 1, fileCount: 0, primarySource: "1", primarySeason: 2, primaryOffset: 0 },
    };
    const live: ExtendedStreamPayload = { title: "Release", hash: "abc", seeders: 12 };
    expect(mergePinStream(stored, live).override?.seasonCount).toBe(1);
    expect(mergePinStream(stored, live).seeders).toBe(12);
  });
});

describe("mapStreamToUI", () => {
  it("puts a preformatted override badge on the UI item", () => {
    const ui = mapStreamToUI(
      {
        title: "Show 1080p",
        hash: "abc",
        override: { seasonCount: 1, fileCount: 0, primarySource: "1", primarySeason: 2, primaryOffset: 0 },
      },
      0,
      t,
      { isLastSelected: true, missingFromResults: true },
    );
    expect(ui.overrideBadge?.label).toBe("S1→S2");
    expect(ui.isLastSelected).toBe(true);
    expect(ui.missingFromResults).toBe(true);
  });

  it("omits the badge when override is missing", () => {
    const ui = mapStreamToUI({ title: "Show" }, 0, t);
    expect(ui.overrideBadge).toBeUndefined();
    expect(ui.isLastSelected).toBeUndefined();
  });
});
