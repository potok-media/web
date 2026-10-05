import { describe, expect, it } from "vitest";
import { nextPlayableIndex, playlistItemLabel } from "./playlistNavigation";
import type { PlaylistItem } from "../../context/playbackTypes";

const item = (title: string, filler = false): PlaylistItem => ({
  title,
  streamUrl: "u",
  filler: filler ? { status: "filler", confidence: null, disputed: false } : null,
});

describe("nextPlayableIndex", () => {
  const playlist = [item("A"), item("B", true), item("C", true), item("D")];

  it("skips fillers forward and backward when the toggle is on", () => {
    expect(nextPlayableIndex(playlist, 0, 1, true)).toBe(3);
    expect(nextPlayableIndex(playlist, 3, -1, true)).toBe(0);
  });

  it("walks one step when the toggle is off", () => {
    expect(nextPlayableIndex(playlist, 0, 1, false)).toBe(1);
    expect(nextPlayableIndex(playlist, 3, -1, false)).toBe(2);
  });

  it("returns undefined when nothing playable remains", () => {
    expect(nextPlayableIndex([item("A", true), item("B", true)], 0, 1, true)).toBeUndefined();
    expect(nextPlayableIndex(playlist, 0, -1, true)).toBeUndefined();
  });
});

describe("playlistItemLabel", () => {
  it("renders the S/E designation with the title", () => {
    expect(playlistItemLabel({ season: 1, episode: 6, title: "Мэш Вандэд", streamUrl: "u" }))
      .toBe("S1E6 — Мэш Вандэд");
    expect(playlistItemLabel({ title: "Movie", streamUrl: "u" })).toBe("Movie");
  });
});
