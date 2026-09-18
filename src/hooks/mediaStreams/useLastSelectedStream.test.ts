import { describe, expect, it, beforeEach } from "vitest";
import {
  LAST_STREAM_PIN_AFTER_PLAYS,
  lastSelectedStreamKey,
  loadLastStreamLedger,
  readLastSelectedStream,
  recordPlayOnLedger,
  streamPlayIdentity,
} from "./useLastSelectedStream";
import { Storage } from "../../utils/StorageService";

describe("lastSelectedStream storage", () => {
  const key = lastSelectedStreamKey("tv", 42);

  beforeEach(() => {
    Storage.remove(key);
  });

  it("builds potok_last_stream:{mediaType}:{mediaId}", () => {
    expect(lastSelectedStreamKey("tv", 123)).toBe("potok_last_stream:tv:123");
    expect(lastSelectedStreamKey("movie", 9)).toBe("potok_last_stream:movie:9");
  });

  it("ignores legacy click snapshots without a play ledger", () => {
    Storage.set(key, { title: "Release", hash: "abc" });
    expect(readLastSelectedStream("tv", 42)).toBeNull();
  });

  it("does not pin until the release has been launched more than twice", () => {
    const stream = { title: "Release", hash: "abc" };
    let ledger = recordPlayOnLedger({ byId: {}, pinnedId: null }, stream);
    ledger = recordPlayOnLedger(ledger, stream);
    expect(ledger.byId[streamPlayIdentity(stream)].playCount).toBe(2);
    expect(ledger.pinnedId).toBeNull();
    Storage.set(key, ledger);
    expect(readLastSelectedStream("tv", 42)).toBeNull();

    ledger = recordPlayOnLedger(ledger, stream);
    expect(ledger.byId[streamPlayIdentity(stream)].playCount).toBe(LAST_STREAM_PIN_AFTER_PLAYS);
    expect(ledger.pinnedId).toBe(streamPlayIdentity(stream));
    Storage.set(key, ledger);
    expect(readLastSelectedStream("tv", 42)?.hash).toBe("abc");
  });

  it("pins the most recent qualifying release", () => {
    const a = { title: "A", hash: "aaa" };
    const b = { title: "B", hash: "bbb" };
    let ledger = { byId: {}, pinnedId: null };
    for (let i = 0; i < LAST_STREAM_PIN_AFTER_PLAYS; i++) ledger = recordPlayOnLedger(ledger, a);
    expect(ledger.pinnedId).toBe(streamPlayIdentity(a));
    for (let i = 0; i < LAST_STREAM_PIN_AFTER_PLAYS; i++) ledger = recordPlayOnLedger(ledger, b);
    expect(ledger.pinnedId).toBe(streamPlayIdentity(b));
  });
});

describe("loadLastStreamLedger", () => {
  const key = lastSelectedStreamKey("tv", 7);

  beforeEach(() => {
    Storage.remove(key);
  });

  it("returns an empty ledger when nothing is stored", () => {
    expect(loadLastStreamLedger("tv", 7)).toEqual({ byId: {}, pinnedId: null });
  });
});
