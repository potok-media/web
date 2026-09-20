import { describe, expect, it } from "vitest";
import { ArmApiError, createArmApiClient, type ArmHttpTransport } from "./ArmApiClient";
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

describe("ARM client", () => {
  it("resolves a typed provider reference with the requested locale", async () => {
    const seen: string[] = [];
    const transport: ArmHttpTransport = {
      async get<T>(path: string): Promise<T> {
        seen.push(path);
        return resolved as T;
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
    expect(result.work?.id).toBe("01900000-0000-7000-8000-000000000001");
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
      async get<T>(path: string): Promise<T> {
        seen.push(path);
        return response as T;
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
