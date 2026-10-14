import { describe, expect, it } from "vitest";
import {
  ArmApiError,
  createArmApiClient,
  type ArmHttpResponse,
  type ArmHttpTransport,
  type ArmTransportGetOptions,
} from "./ArmApiClient";
import type {
  ArmEpisodeLayoutResponse,
  ArmResolveResponse,
} from "./ArmTypes";

const resolved: ArmResolveResponse = {
  workId: "01900000-0000-7000-8000-000000000001",
  graphVersion: "graph-1",
};

const layout: ArmEpisodeLayoutResponse = {
  work: {
    id: "01900000-0000-7000-8000-000000000001",
  },
  graphVersion: "graph-1",
  groups: [],
};

const ok = <T>(body: T): ArmHttpResponse<T> => ({
  status: 200,
  etag: "\"arm-graph-1-abc\"",
  graphVersion: "graph-1",
  body,
});

describe("ARM client", () => {
  it("requests segments by canonical episode identity and release duration with cancellation", async () => {
    const seen: { path: string; signal?: AbortSignal }[] = [];
    const controller = new AbortController();
    const client = createArmApiClient({
      async get<T>(path: string, options?: ArmTransportGetOptions): Promise<ArmHttpResponse<T>> {
        seen.push({ path, signal: options?.signal });
        return { status: 200, etag: null, graphVersion: null };
      },
    });
    await client.getEpisodeSegments("episode/id", { durationMs: 1440123, signal: controller.signal });
    expect(seen).toEqual([{
      path: "/api/arm/v1/episodes/episode%2Fid/segments?durationMs=1440123", signal: controller.signal,
    }]);
  });

  it("resolves a typed provider reference with the requested locale", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return ok(resolved) as ArmHttpResponse<T>;
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.resolveWork(
      { provider: "tmdb", entityKind: "tv", value: "1399/season 1" },
      { locale: "ru-RU" },
    );

    expect(seen).toEqual([
      "/api/arm/v1/works/resolve/tmdb/tv/1399%2Fseason%201?locale=ru-RU",
    ]);
    expect(result.body?.workId).toBe("01900000-0000-7000-8000-000000000001");
    expect(result.etag).toBe("\"arm-graph-1-abc\"");
  });

  it("requests the full layout and supports a single-entry slice via groupId", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return ok(layout) as ArmHttpResponse<T>;
      },
    };

    const client = createArmApiClient(transport);
    await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001", {
      locale: "en-US",
    });
    await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001", {
      locale: "en-US",
      groupId: "01900000-0000-7000-8000-0000000000aa",
    });

    expect(seen).toEqual([
      "/api/arm/v1/works/01900000-0000-7000-8000-000000000001/layout?locale=en-US",
      "/api/arm/v1/works/01900000-0000-7000-8000-000000000001/layout?groupId=01900000-0000-7000-8000-0000000000aa&locale=en-US",
    ]);
  });

  it("forwards the If-None-Match validator to the transport", async () => {
    const seen: (string | undefined)[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(_path: string, options?: { signal?: AbortSignal; ifNoneMatch?: string }): Promise<ArmHttpResponse<T>> {
        seen.push(options?.ifNoneMatch);
        return ok(resolved) as ArmHttpResponse<T>;
      },
    };

    const client = createArmApiClient(transport);
    await client.resolveWork(
      { provider: "tmdb", entityKind: "tv", value: "1399" },
      { ifNoneMatch: "\"arm-graph-1-abc\"" },
    );
    await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-graph-1-ghi\"",
    });

    expect(seen).toEqual([
      "\"arm-graph-1-abc\"",
      "\"arm-graph-1-ghi\"",
    ]);
  });

  it("surfaces a 304 revalidation hit without a body and without throwing", async () => {
    const transport: ArmHttpTransport = {
      async get<T>(): Promise<ArmHttpResponse<T>> {
        return { status: 304, etag: "\"arm-graph-1-abc\"", graphVersion: "graph-1" };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001");

    expect(result.status).toBe(304);
    expect(result.body).toBeUndefined();
    expect(result.etag).toBe("\"arm-graph-1-abc\"");
  });

  it("turns a non-success transport result into a typed error", async () => {
    const transport: ArmHttpTransport = {
      async get(): Promise<never> {
        throw new ArmApiError("ARM unavailable", 503);
      },
    };

    const client = createArmApiClient(transport);

    await expect(client.getEpisodeLayout("01900000-0000-7000-8000-000000000001")).rejects.toMatchObject({
      name: "ArmApiError",
      status: 503,
    });
  });

  // ── New endpoint tests ──────────────────────────────────────────────────

  it("fetches the graph version", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: { builtAt: "2026-10-12T00:00:00Z" } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getGraphVersion();

    expect(seen).toEqual(["/api/arm/v1/version"]);
    expect(result.body?.builtAt).toBe("2026-10-12T00:00:00Z");
  });

  it("fetches a work card", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: {
            workId: "01900000-0000-7000-8000-000000000001",
            type: "tv",
            year: 2024,
            originalTitle: "Test Anime",
            originalLanguage: "ja",
            originCountry: "JP",
            adult: false,
            seasonsCount: 3,
            episodesCount: 48,
            entryCount: 5,
            episodeCount: 48,
          } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getWorkCard("01900000-0000-7000-8000-000000000001");

    expect(seen).toEqual(["/api/arm/v1/works/01900000-0000-7000-8000-000000000001"]);
    expect(result.body?.workId).toBe("01900000-0000-7000-8000-000000000001");
    expect(result.body?.type).toBe("tv");
  });

  it("fetches localized titles", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: {
            titles: [
              { locale: "ja", value: "Test" },
              { locale: "en", value: "Test (EN)" },
              { locale: "ru", value: "Test (RU)" },
            ],
          } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getLocalizedTitles("01900000-0000-7000-8000-000000000001");

    expect(seen).toEqual(["/api/arm/v1/works/01900000-0000-7000-8000-000000000001/localized-titles"]);
    expect(result.body?.titles.length).toBe(3);
  });

  it("fetches external IDs as a flat list", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: {
            externalIds: [
              { provider: "tmdb", entityKind: "tv", value: "65930" },
              { provider: "anilist", entityKind: "anime", value: "21459" },
            ],
          } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getExternalIds("01900000-0000-7000-8000-000000000001");

    expect(seen).toEqual(["/api/arm/v1/works/01900000-0000-7000-8000-000000000001/external-ids/simple"]);
    expect(result.body?.externalIds.length).toBe(2);
  });

  it("fetches paginated entries with kind filter", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: {
            entries: [
              {
                entryId: "e1",
                kind: "season",
                number: 1,
                sortPosition: 0,
                structureSource: "anilist",
                externalIds: [],
                localizedTitles: [],
                tmdb: { showId: 65930, season: 1 },
                displayMetadata: null,
              },
            ],
          } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getEntries("01900000-0000-7000-8000-000000000001", { kind: "season" });

    expect(seen).toEqual([
      "/api/arm/v1/works/01900000-0000-7000-8000-000000000001/entries?kind=season",
    ]);
    expect(result.body?.entries.length).toBe(1);
  });

  it("fetches paginated episodes with groupId", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return {
          status: 200,
          etag: null,
          graphVersion: null,
          body: {
            episodes: [
              {
                episodeId: "ep1",
                groupId: "e1",
                number: 1,
                tmdb: { showId: 65930, season: 1, episode: 1 },
                localizedTitles: [{ locale: "en", value: "Episode 1" }],
                overview: null,
                stillPath: null,
                airDate: "2024-01-01",
                filler: null,
              },
            ],
          } as T,
        };
      },
    };

    const client = createArmApiClient(transport);
    const result = await client.getEpisodes("01900000-0000-7000-8000-000000000001", {
      groupId: "e1",
    });

    expect(seen).toEqual([
      "/api/arm/v1/works/01900000-0000-7000-8000-000000000001/episodes?groupId=e1",
    ]);
    expect(result.body?.episodes.length).toBe(1);
  });

  it("forwards ifNoneMatch to new endpoints", async () => {
    const seenValidators: (string | undefined)[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(_path: string, options?: { signal?: AbortSignal; ifNoneMatch?: string }): Promise<ArmHttpResponse<T>> {
        seenValidators.push(options?.ifNoneMatch);
        return { status: 200, etag: null, graphVersion: null, body: {} as T };
      },
    };

    const client = createArmApiClient(transport);

    await client.getWorkCard("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-work-card\"",
    });
    await client.getEntries("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-entries\"",
    });
    await client.getEpisodes("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-episodes\"",
    });

    expect(seenValidators).toEqual([
      "\"arm-work-card\"",
      "\"arm-entries\"",
      "\"arm-episodes\"",
    ]);
  });

  it("throws ArmApiError on non-2xx responses for new endpoints", async () => {
    const transport: ArmHttpTransport = {
      async get(): Promise<never> {
        throw new ArmApiError("ARM unavailable", 503);
      },
    };

    const client = createArmApiClient(transport);

    await expect(client.getWorkCard("01900000-0000-7000-8000-000000000001")).rejects.toMatchObject({
      name: "ArmApiError",
      status: 503,
    });
    await expect(client.getEntries("01900000-0000-7000-8000-000000000001")).rejects.toMatchObject({
      name: "ArmApiError",
      status: 503,
    });
  });
});
