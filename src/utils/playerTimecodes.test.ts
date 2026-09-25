import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArmClient, ArmHttpResponse } from "../network/ArmApiClient";
import type { ArmReleaseVariantSegmentsResponse } from "../network/ArmTypes";
import { EMPTY_TIMECODES, loadPlayerTimecodes, type PlayerTimecodesRequest } from "./playerTimecodes";

const request: PlayerTimecodesRequest = {
  tmdbId: 1399, season: 1, episode: 2, armEpisodeId: "episode-2", isTv: true, durationMs: 1440000,
};

function armResult(overrides: Partial<ArmReleaseVariantSegmentsResponse> = {}): ArmReleaseVariantSegmentsResponse {
  return {
    graphVersion: "graph-1", resolutionState: "resolved", coverageState: "complete", warnings: [],
    requestedReleaseVariantId: null,
    releaseVariant: {
      id: "cut-1", workId: "work-1", episodeId: "episode-2", releaseId: "aniskip", fileId: null,
      fingerprint: null, durationMs: 1440000,
    },
    segments: [
      { id: "op", releaseVariantId: "cut-1", kind: "opening", startMs: 10000, endMs: 100000,
        confidence: 1, sourceId: "aniskip", provenance: null, publicationPolicy: "public" },
      { id: "ed", releaseVariantId: "cut-1", kind: "ending", startMs: 1350000, endMs: 1440000,
        confidence: 1, sourceId: "aniskip", provenance: null, publicationPolicy: "public" },
    ],
    ...overrides,
  };
}

function response(body: ArmReleaseVariantSegmentsResponse): ArmHttpResponse<ArmReleaseVariantSegmentsResponse> {
  return { status: 200, etag: null, graphVersion: "graph-1", body };
}

function sources(body = armResult()) {
  return {
    getEpisodeSegments: vi.fn<ArmClient["getEpisodeSegments"]>().mockResolvedValue(response(body)),
    fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      intro: [{ start_ms: 20000, end_ms: 110000 }], credits: [{ start_ms: 1360000, end_ms: null }],
    })),
  };
}

afterEach(() => vi.useRealTimers());

describe("player timecode sources", () => {
  it("loads canonical ARM episode segments in milliseconds before trying TheIntroDB", async () => {
    const clients = sources();
    expect(await loadPlayerTimecodes(request, clients, new AbortController().signal)).toEqual({
      introRange: { start: 10, end: 100 }, outroRange: { start: 1350, end: 1440 },
    });
    expect(clients.getEpisodeSegments).toHaveBeenCalledWith("episode-2", {
      durationMs: 1440000, signal: expect.any(AbortSignal),
    });
    expect(clients.fetch).not.toHaveBeenCalled();
  });

  it.each(["missing", "empty", "ambiguous", "duration", "unknown-duration", "wrong-episode"])(
    "falls back when the ARM result is %s", async (condition) => {
      const body = armResult();
      if (condition === "missing") body.releaseVariant = null;
      if (condition === "empty") body.segments = [];
      if (condition === "ambiguous") body.resolutionState = "ambiguous";
      if (condition === "duration") body.releaseVariant!.durationMs = 1442001;
      if (condition === "unknown-duration") body.releaseVariant!.durationMs = null;
      if (condition === "wrong-episode") body.releaseVariant!.episodeId = "episode-1";
      const clients = sources(body);
      expect(await loadPlayerTimecodes(request, clients, new AbortController().signal)).toEqual({
        introRange: { start: 20, end: 110 }, outroRange: { start: 1360, end: 1440 },
      });
      expect(clients.fetch).toHaveBeenCalledWith(
        "https://api.theintrodb.org/v3/media?tmdb_id=1399&season=1&episode=2&duration_ms=1440000",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    },
  );

  it("fills a missing ending without overriding the ARM opening", async () => {
    const clients = sources(armResult({ segments: armResult().segments.slice(0, 1) }));
    expect(await loadPlayerTimecodes(request, clients, new AbortController().signal)).toEqual({
      introRange: { start: 10, end: 100 }, outroRange: { start: 1360, end: 1440 },
    });
  });

  it("falls back after a Gateway failure", async () => {
    const clients = sources();
    clients.getEpisodeSegments.mockRejectedValue(new Error("HTTP 503"));
    expect((await loadPlayerTimecodes(request, clients, new AbortController().signal)).introRange).toEqual({ start: 20, end: 110 });
  });

  it("does not let a stalled ARM request prevent fallback", async () => {
    vi.useFakeTimers();
    const clients = sources();
    clients.getEpisodeSegments.mockImplementation((_id, { signal }) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")), { once: true });
    }));
    const result = loadPlayerTimecodes(request, clients, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(5000);
    expect((await result).introRange).toEqual({ start: 20, end: 110 });
  });

  it("uses TheIntroDB directly without an ARM identity and preserves season zero", async () => {
    const clients = sources();
    await loadPlayerTimecodes({ ...request, armEpisodeId: undefined, season: 0 }, clients, new AbortController().signal);
    expect(clients.getEpisodeSegments).not.toHaveBeenCalled();
    expect(clients.fetch.mock.calls[0][0]).toContain("season=0");
  });

  it.each([0, -1, Infinity, NaN])("waits for a real finite duration (%s)", async (durationMs) => {
    const clients = sources();
    expect(await loadPlayerTimecodes({ ...request, durationMs }, clients, new AbortController().signal)).toEqual(EMPTY_TIMECODES);
    expect(clients.getEpisodeSegments).not.toHaveBeenCalled();
    expect(clients.fetch).not.toHaveBeenCalled();
  });

  it("does not invent S1E1 when the TMDB coordinates are missing", async () => {
    const clients = sources();
    expect(await loadPlayerTimecodes({ ...request, armEpisodeId: undefined, episode: undefined }, clients, new AbortController().signal)).toEqual(EMPTY_TIMECODES);
    expect(clients.fetch).not.toHaveBeenCalled();
  });

  it("does not invent ranges when both sources have no data", async () => {
    const clients = sources(armResult({ segments: [] }));
    clients.fetch.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await loadPlayerTimecodes(request, clients, new AbortController().signal)).toEqual(EMPTY_TIMECODES);
  });

  it("rejects invalid ranges and normalizes documented TheIntroDB null boundaries", async () => {
    const clients = sources(armResult({ segments: [] }));
    clients.fetch.mockResolvedValue(Response.json({
      intro: [{ start_ms: -1, end_ms: 5000 }, { start_ms: 100, end_ms: 0 }, {}, { start_ms: null, end_ms: 90000 }],
      credits: [{ start_ms: 1400000, end_ms: 1500000 }, { start_ms: 1370000, end_ms: null }],
    }));
    expect(await loadPlayerTimecodes(request, clients, new AbortController().signal)).toEqual({
      introRange: { start: 0, end: 90 }, outroRange: { start: 1370, end: 1440 },
    });
  });

  it("ignores ARM segments belonging to another cut or exceeding playback duration", async () => {
    const body = armResult();
    body.segments[0].releaseVariantId = "other-cut";
    body.segments[1].endMs = 1441000;
    const clients = sources(body);
    expect((await loadPlayerTimecodes(request, clients, new AbortController().signal)).introRange).toEqual({ start: 20, end: 110 });
    expect(clients.fetch).toHaveBeenCalledOnce();
  });

  it("does not leak a late ARM response or begin fallback after an episode is cancelled", async () => {
    const clients = sources();
    let complete!: (value: ArmHttpResponse<ArmReleaseVariantSegmentsResponse>) => void;
    clients.getEpisodeSegments.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const controller = new AbortController();
    const result = loadPlayerTimecodes(request, clients, controller.signal);
    controller.abort();
    complete(response(armResult()));
    expect(await result).toEqual(EMPTY_TIMECODES);
    expect(clients.fetch).not.toHaveBeenCalled();
  });

  it("does not leak a late TheIntroDB response after the duration or stream changed", async () => {
    const clients = sources();
    let complete!: (value: Response) => void;
    clients.fetch.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const controller = new AbortController();
    const result = loadPlayerTimecodes({ ...request, armEpisodeId: undefined }, clients, controller.signal);
    controller.abort();
    complete(Response.json({ intro: [{ start_ms: 0, end_ms: 90000 }] }));
    expect(await result).toEqual(EMPTY_TIMECODES);
  });
});
