import { describe, expect, it } from "vitest";
import { createArmSdkClient, SDKArmError, type SDKArmTransport } from "./arm";
import type { SDKArmResolveResponse } from "../types";

const response: SDKArmResolveResponse = {
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

describe("PotokSDK.arm", () => {
  it("resolves provider identity through the first-party ARM route", async () => {
    const paths: string[] = [];
    const transport: SDKArmTransport = {
      async get(path) {
        paths.push(path);
        return { status: 200, data: JSON.stringify(response) };
      },
    };

    const arm = createArmSdkClient(transport);
    const resolved = await arm.resolveWork(
      { provider: "tmdb", entityKind: "tv", value: "1399" },
      { locale: "ru-RU" },
    );

    expect(paths).toEqual(["/api/arm/v1/resolve/tmdb/tv/1399?locale=ru-RU"]);
    expect(resolved.work?.id).toBe("work-1");
  });

  it("reports HTTP failures as typed SDK errors", async () => {
    const transport: SDKArmTransport = {
      async get() {
        return { status: 503, data: { title: "ARM unavailable" } };
      },
    };

    const arm = createArmSdkClient(transport);

    await expect(arm.getWork("work-1")).rejects.toEqual(
      expect.objectContaining<Partial<SDKArmError>>({ name: "SDKArmError", status: 503 }),
    );
  });

  it("supports cancellation before a request crosses the SDK seam", async () => {
    let requested = false;
    const transport: SDKArmTransport = {
      async get() {
        requested = true;
        return { status: 200, data: response };
      },
    };
    const controller = new AbortController();
    controller.abort();

    await expect(createArmSdkClient(transport).getWork("work-1", {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(requested).toBe(false);
  });

  it("inherits the host locale when the plugin does not override it", async () => {
    const paths: string[] = [];
    const transport: SDKArmTransport = {
      async get(path) {
        paths.push(path);
        return { status: 200, data: response };
      },
    };

    const arm = createArmSdkClient(transport, { getLocale: () => "ru-RU" });
    await arm.getWork("work-1");

    expect(paths).toEqual(["/api/arm/v1/works/work-1?locale=ru-RU"]);
  });
});
