import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArmHttpResponse } from "../../network/ArmApiClient";
import type { ArmEpisodeLayoutResponse, ArmResolveResponse } from "../../network/ArmTypes";
import {
  armLayoutCacheKey,
  armResolveCacheKey,
  clearArmLayoutCaches,
  getArmLayoutCached,
  getArmResolveCached,
} from "./armLayoutCache";

const resolveResponse: ArmResolveResponse = {
  graphVersion: "graph-1",
  resolutionState: "resolved",
  coverageState: "complete",
  warnings: [],
  query: { provider: "tmdb", entityKind: "tv", value: "1399" },
  alternatives: [],
  work: {
    id: "work-1",
    kind: "series",
    defaultOrderingId: "ordering-1",
    displayTitle: null,
    providerReferences: [],
  },
};

const layoutResponse: ArmEpisodeLayoutResponse = {
  graphVersion: "graph-1",
  resolutionState: "resolved",
  coverageState: "complete",
  warnings: [],
  workId: "work-1",
  ordering: { id: "ordering-1", kind: "potokDefault", isDefault: true },
  groups: [],
};

const ok = <T>(body: T, etag = "\"arm-graph-1-a\""): ArmHttpResponse<T> => ({
  status: 200,
  etag,
  graphVersion: "graph-1",
  body,
});

const notModified = (): ArmHttpResponse<never> => ({
  status: 304,
  etag: "\"arm-graph-1-a\"",
  graphVersion: "graph-1",
});

const reference = { provider: "tmdb", entityKind: "tv", value: "1399" };

describe("ARM layout cache", () => {
  beforeEach(() => {
    clearArmLayoutCaches();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds keys that isolate provider references and locales", () => {
    expect(armResolveCacheKey(reference, "ru")).toBe("tmdb/tv/1399|ru");
    expect(armLayoutCacheKey("work-1", "default", "en")).toBe("work-1|default|en");
    expect(armResolveCacheKey(reference, "en")).not.toBe(armResolveCacheKey(reference, "ru"));
  });

  it("serves a fresh entry without hitting the network again", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return ok(resolveResponse);
    };

    await getArmResolveCached(reference, "ru", fetcher);
    const second = await getArmResolveCached(reference, "ru", fetcher);

    expect(calls).toBe(1);
    expect(second).toBe(resolveResponse);
  });

  it("revalidates a stale entry with If-None-Match and serves the cache on 304", async () => {
    const seenValidators: (string | undefined)[] = [];
    let calls = 0;
    const fetcher = async (ifNoneMatch?: string): Promise<ArmHttpResponse<ArmResolveResponse>> => {
      seenValidators.push(ifNoneMatch);
      calls++;
      return calls === 1 ? ok(resolveResponse) : notModified();
    };

    await getArmResolveCached(reference, "ru", fetcher);
    vi.setSystemTime(new Date("2026-09-22T12:06:00Z"));
    const revalidated = await getArmResolveCached(reference, "ru", fetcher);

    expect(seenValidators).toEqual([undefined, "\"arm-graph-1-a\""]);
    expect(revalidated).toBe(resolveResponse);
  });

  it("replaces the cached payload when revalidation returns a fresh body", async () => {
    const updated: ArmEpisodeLayoutResponse = { ...layoutResponse, graphVersion: "graph-2" };
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return calls === 1
        ? ok(layoutResponse, "\"arm-graph-1-a\"")
        : ok(updated, "\"arm-graph-2-b\"");
    };

    const first = await getArmLayoutCached("work-1", "default", "ru", fetcher);
    vi.setSystemTime(new Date("2026-09-22T12:06:00Z"));
    const second = await getArmLayoutCached("work-1", "default", "ru", fetcher);

    expect(first.graphVersion).toBe("graph-1");
    expect(second.graphVersion).toBe("graph-2");
  });

  it("revalidates even a fresh entry when forced (hydration retry)", async () => {
    let calls = 0;
    const fetcher = async (): Promise<ArmHttpResponse<ArmResolveResponse>> => {
      calls++;
      return calls === 1 ? ok(resolveResponse) : notModified();
    };

    await getArmResolveCached(reference, "ru", fetcher);
    const revalidated = await getArmResolveCached(reference, "ru", fetcher, true);

    expect(calls).toBe(2);
    expect(revalidated).toBe(resolveResponse);
  });

  it("fails loudly when a 304 arrives without anything cached", async () => {
    const fetcher = async (): Promise<ArmHttpResponse<ArmEpisodeLayoutResponse>> => notModified();
    await expect(getArmLayoutCached("work-1", "default", "ru", fetcher)).rejects.toThrow(
      /304/,
    );
  });
});
