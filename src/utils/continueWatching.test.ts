import { beforeEach, describe, expect, it } from "vitest";
import {
  CONTINUE_WATCHING_MAX_AGE_MS,
  CONTINUE_WATCHING_MAX_ITEMS,
  CONTINUE_WATCHING_STORAGE_KEY,
  applyContinueProgress,
  applyProgressToLedger,
  canonicalArmId,
  formatProgressLabel,
  formatTimecode,
  listContinueCursors,
  listCursorsFromLedger,
  stripEpisodeSuffix,
  useContinueWatchingCursors,
  type ContinueLedger,
  type ContinueProgressPayload,
} from "./continueWatching";

const WORK_ID = "11111111-2222-3333-4444-555555555555";
const WORK_ID_2 = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ENTRY_ID = "66666666-7777-8888-9999-000000000000";
const EPISODE_ID = "123e4567-e89b-42d3-a456-426614174000";

const NOW = 1_800_000_000_000;

function progressPayload(overrides: Partial<ContinueProgressPayload> = {}): ContinueProgressPayload {
  return {
    id: 0,
    mediaType: "tv",
    workId: WORK_ID,
    entryId: ENTRY_ID,
    episodeId: EPISODE_ID,
    title: "Show - S01E03 1080p",
    providerId: "potok-torrents",
    streamHash: "ABCDEF0123456789",
    fileIndex: "3",
    progressSeconds: 300,
    durationSeconds: 1800,
    voice: "Studio Voice",
    ...overrides,
  };
}

describe("canonicalArmId", () => {
  it("accepts ARM uuids and lowercases them", () => {
    expect(canonicalArmId(WORK_ID)).toBe(WORK_ID);
    expect(canonicalArmId("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).toBe(WORK_ID_2);
  });

  it("rejects null ARM ids, non-uuids and non-strings", () => {
    expect(canonicalArmId("00000000-0000-0000-0000-000000000000")).toBeUndefined();
    expect(canonicalArmId("tt12345")).toBeUndefined();
    expect(canonicalArmId(42)).toBeUndefined();
    expect(canonicalArmId(undefined)).toBeUndefined();
  });
});

describe("formatTimecode", () => {
  it("formats mm:ss under an hour and h:mm:ss above it", () => {
    expect(formatTimecode(0)).toBe("0:00");
    expect(formatTimecode(65)).toBe("1:05");
    expect(formatTimecode(3599)).toBe("59:59");
    expect(formatTimecode(3600)).toBe("1:00:00");
    expect(formatTimecode(3661)).toBe("1:01:01");
  });

  it("coerces garbage to 0:00", () => {
    expect(formatTimecode(undefined)).toBe("0:00");
    expect(formatTimecode("oops")).toBe("0:00");
    expect(formatTimecode(-5)).toBe("0:00");
  });
});

describe("formatProgressLabel", () => {
  it("joins progress and total when duration is known", () => {
    expect(formatProgressLabel(300, 1800)).toBe("5:00 / 30:00");
  });

  it("omits the total when duration is unknown or zero", () => {
    expect(formatProgressLabel(300, 0)).toBe("5:00");
    expect(formatProgressLabel(300, undefined)).toBe("5:00");
  });
});

describe("stripEpisodeSuffix", () => {
  it("strips release episode suffixes", () => {
    expect(stripEpisodeSuffix("Show - S01E03 1080p")).toBe("Show");
    expect(stripEpisodeSuffix("Movie (2024)")).toBe("Movie (2024)");
  });
});

describe("applyProgressToLedger", () => {
  it("pins a cursor keyed by ARM workId", () => {
    const { ledger, changed } = applyProgressToLedger({}, progressPayload(), NOW);
    expect(changed).toBe(true);
    const cursor = ledger[WORK_ID];
    expect(cursor).toBeDefined();
    expect(cursor.key).toBe(WORK_ID);
    expect(cursor.workId).toBe(WORK_ID);
    expect(cursor.mediaType).toBe("tv");
    expect(cursor.title).toBe("Show");
    expect(cursor.fileIndex).toBe("3");
    expect(cursor.audioName).toBe("Studio Voice");
    expect(cursor.updatedAt).toBe(NOW);
  });

  it("falls back to a tmdb-scoped key when workId is missing", () => {
    const { ledger, changed } = applyProgressToLedger(
      {},
      progressPayload({ workId: null, id: 550 }),
      NOW,
    );
    expect(changed).toBe(true);
    expect(ledger["tmdb:550"]).toBeDefined();
    expect(ledger["tmdb:550"].tmdbId).toBe(550);
  });

  it("ignores payloads with neither ARM workId nor a tmdb id", () => {
    const { changed } = applyProgressToLedger({}, progressPayload({ workId: null, id: 0 }), NOW);
    expect(changed).toBe(false);
  });

  it("requires a stream identity (progressId or hash+fileIndex)", () => {
    const noIdentity = applyProgressToLedger(
      {},
      progressPayload({ streamHash: undefined, fileIndex: undefined }),
      NOW,
    );
    expect(noIdentity.changed).toBe(false);

    const byProgressId = applyProgressToLedger(
      {},
      progressPayload({ streamHash: undefined, fileIndex: undefined, progressId: "online-balancers://kodik/1" }),
      NOW,
    );
    expect(byProgressId.changed).toBe(true);
  });

  it("removes the cursor when the playback completes", () => {
    const seeded = applyProgressToLedger({}, progressPayload(), NOW).ledger;
    const { ledger, changed } = applyProgressToLedger(
      seeded,
      progressPayload({ isCompleted: true }),
      NOW + 1000,
    );
    expect(changed).toBe(true);
    expect(ledger[WORK_ID]).toBeUndefined();
  });

  it("completing an unknown key is a no-op", () => {
    const { changed } = applyProgressToLedger({}, progressPayload({ isCompleted: true }), NOW);
    expect(changed).toBe(false);
  });

  it("keeps the previous still and sourceStream when the same episode is re-announced", () => {
    const first = applyProgressToLedger(
      {},
      progressPayload({ stillSrc: "https://img/still.jpg" }),
      NOW,
    ).ledger;
    const sourceStream = first[WORK_ID].sourceStream;
    const second = applyProgressToLedger(
      first,
      progressPayload({ stillSrc: undefined, sourceStream: undefined, progressSeconds: 600 }),
      NOW + 1000,
    ).ledger;
    expect(second[WORK_ID].stillSrc).toBe("https://img/still.jpg");
    expect(second[WORK_ID].sourceStream).toEqual(sourceStream);
    expect(second[WORK_ID].progressSeconds).toBe(600);
  });

  it("drops the still when a different episode replaces the pinned one", () => {
    const first = applyProgressToLedger(
      {},
      progressPayload({ stillSrc: "https://img/still.jpg" }),
      NOW,
    ).ledger;
    const second = applyProgressToLedger(
      first,
      progressPayload({ fileIndex: "4", episodeId: undefined, stillSrc: undefined }),
      NOW + 1000,
    ).ledger;
    expect(second[WORK_ID].stillSrc).toBeUndefined();
    expect(second[WORK_ID].fileIndex).toBe("4");
  });

  it(`caps the ledger at ${CONTINUE_WATCHING_MAX_ITEMS} items by recency`, () => {
    let ledger: ContinueLedger = {};
    for (let i = 0; i < CONTINUE_WATCHING_MAX_ITEMS + 3; i++) {
      ledger = applyProgressToLedger(
        ledger,
        progressPayload({ workId: undefined, id: 1000 + i }),
        NOW + i * 1000,
      ).ledger;
    }
    expect(Object.keys(ledger)).toHaveLength(CONTINUE_WATCHING_MAX_ITEMS);
    expect(ledger["tmdb:1000"]).toBeUndefined();
    expect(ledger[`tmdb:${1000 + CONTINUE_WATCHING_MAX_ITEMS + 2}`]).toBeDefined();
  });

  it("evicts expired cursors while applying", () => {
    const seeded = applyProgressToLedger({}, progressPayload(), NOW).ledger;
    const { ledger } = applyProgressToLedger(
      seeded,
      progressPayload({ workId: WORK_ID_2 }),
      NOW + CONTINUE_WATCHING_MAX_AGE_MS + 1000,
    );
    expect(ledger[WORK_ID]).toBeUndefined();
    expect(ledger[WORK_ID_2]).toBeDefined();
  });
});

describe("listCursorsFromLedger", () => {
  it("sorts newest first, filters expired and caps the list", () => {
    let ledger: ContinueLedger = {};
    for (let i = 0; i < CONTINUE_WATCHING_MAX_ITEMS + 2; i++) {
      ledger = applyProgressToLedger(
        ledger,
        progressPayload({ workId: undefined, id: 2000 + i }),
        NOW + i * 1000,
      ).ledger;
    }
    const list = listCursorsFromLedger(ledger, NOW + 5000);
    expect(list).toHaveLength(CONTINUE_WATCHING_MAX_ITEMS);
    expect(list[0].key).toBe(`tmdb:${2000 + CONTINUE_WATCHING_MAX_ITEMS + 1}`);
    expect(list.at(-1)!.updatedAt).toBeGreaterThan(NOW - 1);
  });
});

describe("storage-bound singleton", () => {
  const backingStore = new Map<string, string>();

  beforeEach(() => {
    backingStore.clear();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (key: string) => (backingStore.has(key) ? backingStore.get(key)! : null),
      setItem: (key: string, value: string) => void backingStore.set(key, String(value)),
      removeItem: (key: string) => void backingStore.delete(key),
      clear: () => backingStore.clear(),
    };
  });

  it("applyContinueProgress persists and listContinueCursors reads back", () => {
    expect(listContinueCursors()).toEqual([]);
    applyContinueProgress(progressPayload());
    const stored = JSON.parse(backingStore.get(CONTINUE_WATCHING_STORAGE_KEY) || "{}");
    expect(stored[WORK_ID]).toBeDefined();
    const list = listContinueCursors();
    expect(list).toHaveLength(1);
    expect(list[0].key).toBe(WORK_ID);
    expect(list[0].providerId).toBe("potok-torrents");
    expect(list[0].progressSeconds).toBe(300);
  });

  it("skips identity-less payloads without touching storage", () => {
    applyContinueProgress(progressPayload({ streamHash: undefined, fileIndex: undefined, progressId: undefined }));
    expect(backingStore.get(CONTINUE_WATCHING_STORAGE_KEY)).toBeUndefined();
  });

  it("removes completed items from storage", () => {
    applyContinueProgress(progressPayload());
    applyContinueProgress(progressPayload({ isCompleted: true }));
    expect(listContinueCursors()).toEqual([]);
  });

  it("tolerates corrupted storage content", () => {
    backingStore.set(CONTINUE_WATCHING_STORAGE_KEY, "{not json");
    expect(listContinueCursors()).toEqual([]);
    backingStore.set(CONTINUE_WATCHING_STORAGE_KEY, JSON.stringify({ garbage: 42, [WORK_ID]: { updatedAt: "nope" } }));
    expect(listContinueCursors()).toEqual([]);
  });

  it("exposes a React hook reading the same snapshot", () => {
    applyContinueProgress(progressPayload());
    // Renderless smoke check: the hook is exercised in component tests; here we only verify
    // the store accessor contract the hook relies on.
    expect(typeof useContinueWatchingCursors).toBe("function");
    expect(listContinueCursors()[0].mediaType).toBe("tv");
  });
});
