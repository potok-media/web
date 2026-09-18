import { describe, expect, it, beforeEach } from "vitest";
import {
  CONTINUE_WATCHING_STORAGE_KEY,
  continueTitleKey,
  parseContinueLedger,
  pluginScopedStorageKey,
  readContinueCursor,
} from "./useLastSelectedStream";

const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
} as Pick<Storage, "getItem" | "setItem" | "removeItem">;

Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });

describe("continue cursor storage", () => {
  const pluginId = "potok-torrents";
  const key = pluginScopedStorageKey(pluginId, CONTINUE_WATCHING_STORAGE_KEY);

  beforeEach(() => {
    mem.clear();
  });

  it("builds scoped plugin keys", () => {
    expect(continueTitleKey("tv", 42)).toBe("tv:42");
    expect(key).toBe("potok_plugin:scoped:potok-torrents:continueWatching");
  });

  it("reads a cursor stream for the title and ignores junk", () => {
    expect(readContinueCursor(pluginId, "tv", 42)).toBeNull();
    localStorage.setItem(
      key,
      JSON.stringify({
        "tv:42": {
          mediaType: "tv",
          tmdbId: 42,
          title: "Show",
          stream: { title: "Release", hash: "abc" },
          fileIndex: "3",
          progressSeconds: 80,
          durationSeconds: 1400,
          updatedAt: Date.now(),
        },
      }),
    );
    expect(readContinueCursor(pluginId, "tv", 42)?.stream.hash).toBe("abc");
    expect(parseContinueLedger("nope")).toEqual({});
  });
});
