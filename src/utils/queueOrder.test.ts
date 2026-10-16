import { describe, expect, it } from "vitest";
import type { PlaylistItem } from "../context/playbackTypes";
import { moveItemById, orderItemsByIds, reorderPlaylistKeepingCurrent } from "./queueOrder";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("queueOrder", () => {
  it("moves an item to the target position without mutating the input", () => {
    const result = moveItemById(items, "a", "c");
    expect(result.map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps unlisted items in their stable order", () => {
    expect(orderItemsByIds(items, ["c", "a"]).map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("preserves the active playlist item while its index changes", () => {
    const playlist = items as PlaylistItem[];
    const result = reorderPlaylistKeepingCurrent(playlist, ["c", "a", "b"], 1);
    expect(result.playlist.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(result.playlistIndex).toBe(2);
    expect(result.playlist[result.playlistIndex]).toBe(playlist[1]);
  });
});
