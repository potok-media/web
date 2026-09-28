import { describe, expect, it } from "vitest";
import { createArmSdkClient, SDKArmError, type SDKArmTransport } from "./arm";
import type { SDKArmEpisodeLayoutResponse, SDKArmResolveResponse } from "../types";

const resolveResponse: SDKArmResolveResponse = {
  workId: "work-1",
  graphVersion: "graph-1",
};

const layoutResponse: SDKArmEpisodeLayoutResponse = {
  work: { id: "work-1" },
  graphVersion: "graph-1",
  groups: [],
};

describe("PotokSDK.arm", () => {
  it("resolves provider identity through the first-party ARM route", async () => {
    const paths: string[] = [];
    const transport: SDKArmTransport = {
      async get(path) {
        paths.push(path);
        return { status: 200, data: JSON.stringify(resolveResponse) };
      },
    };

    const arm = createArmSdkClient(transport);
    const resolved = await arm.resolveWork(
      { provider: "tmdb", entityKind: "tv", value: "1399" },
      { locale: "ru-RU" },
    );

    expect(paths).toEqual(["/api/arm/v1/works/resolve/tmdb/tv/1399?locale=ru-RU"]);
    expect(resolved.workId).toBe("work-1");
  });

  it("requests the work layout and supports a single-entry slice", async () => {
    const paths: string[] = [];
    const transport: SDKArmTransport = {
      async get(path) {
        paths.push(path);
        return { status: 200, data: layoutResponse };
      },
    };

    const arm = createArmSdkClient(transport);
    await arm.getEpisodeLayout("work-1");
    await arm.getEpisodeLayout("work-1", { groupId: "entry-1" });

    expect(paths).toEqual([
      "/api/arm/v1/works/work-1/layout",
      "/api/arm/v1/works/work-1/layout?groupId=entry-1",
    ]);
  });

  it("reports HTTP failures as typed SDK errors", async () => {
    const transport: SDKArmTransport = {
      async get() {
        return { status: 503, data: { title: "ARM unavailable" } };
      },
    };

    const arm = createArmSdkClient(transport);

    await expect(arm.getEpisodeLayout("work-1")).rejects.toEqual(
      expect.objectContaining<Partial<SDKArmError>>({ name: "SDKArmError", status: 503 }),
    );
  });

  it("supports cancellation before a request crosses the SDK seam", async () => {
    let requested = false;
    const transport: SDKArmTransport = {
      async get() {
        requested = true;
        return { status: 200, data: resolveResponse };
      },
    };
    const controller = new AbortController();
    controller.abort();

    await expect(createArmSdkClient(transport).getEpisodeLayout("work-1", {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(requested).toBe(false);
  });

  it("inherits the host locale when the plugin does not override it", async () => {
    const paths: string[] = [];
    const transport: SDKArmTransport = {
      async get(path) {
        paths.push(path);
        return { status: 200, data: layoutResponse };
      },
    };

    const arm = createArmSdkClient(transport, { getLocale: () => "ru-RU" });
    await arm.getEpisodeLayout("work-1");

    expect(paths).toEqual(["/api/arm/v1/works/work-1/layout?locale=ru-RU"]);
  });
});
