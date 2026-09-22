import { describe, expect, it } from "vitest";
import {
  ArmApiError,
  createArmApiClient,
  type ArmHttpResponse,
  type ArmHttpTransport,
} from "./ArmApiClient";
import type { ArmEpisodeLayoutResponse, ArmResolveResponse } from "./ArmTypes";

const resolved: ArmResolveResponse = {
  graphVersion: "graph-1",
  resolutionState: "resolved",
  coverageState: "complete",
  warnings: [],
  query: { provider: "tmdb", entityKind: "tv", value: "1399" },
  alternatives: [],
  work: {
    id: "01900000-0000-7000-8000-000000000001",
    kind: "series",
    defaultOrderingId: "01900000-0000-7000-8000-000000000002",
    displayTitle: {
      value: "Game of Thrones",
      requestedLocale: "en-US",
      resolvedLocale: "en-US",
      role: "official",
      usedFallback: false,
    },
    providerReferences: [{ provider: "tmdb", entityKind: "tv", value: "1399" }],
  },
};

const ok = <T>(body: T): ArmHttpResponse<T> => ({
  status: 200,
  etag: "\"arm-graph-1-abc\"",
  graphVersion: "graph-1",
  body,
});

describe("ARM client", () => {
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
      "/api/arm/v1/resolve/tmdb/tv/1399%2Fseason%201?locale=ru-RU",
    ]);
    expect(result.body?.work?.id).toBe("01900000-0000-7000-8000-000000000001");
    expect(result.etag).toBe("\"arm-graph-1-abc\"");
  });

  it("requests the Potok default ordering unless another ordering is selected", async () => {
    const seen: string[] = [];
    const response: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-1",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "01900000-0000-7000-8000-000000000001",
      ordering: {
        id: "01900000-0000-7000-8000-000000000002",
        kind: "potokDefault",
        isDefault: true,
      },
      groups: [],
    };
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<ArmHttpResponse<T>> {
        seen.push(path);
        return ok(response) as ArmHttpResponse<T>;
      },
    };

    const client = createArmApiClient(transport);
    await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001", {
      locale: "en-US",
    });

    expect(seen).toEqual([
      "/api/arm/v1/works/01900000-0000-7000-8000-000000000001/layout?ordering=default&locale=en-US",
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
    await client.getWork("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-graph-1-def\"",
    });
    await client.getEpisodeLayout("01900000-0000-7000-8000-000000000001", {
      ifNoneMatch: "\"arm-graph-1-ghi\"",
    });

    expect(seen).toEqual([
      "\"arm-graph-1-abc\"",
      "\"arm-graph-1-def\"",
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

    await expect(client.getWork("01900000-0000-7000-8000-000000000001")).rejects.toMatchObject({
      name: "ArmApiError",
      status: 503,
    });
  });
});
