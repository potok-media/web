import { describe, expect, it, vi } from "vitest";
import { loadArmBindingLayout } from "./armBindingLayout";
import type { ArmEpisodeLayoutResponse, ArmResolveResponse } from "../../network/ArmTypes";

const layout: ArmEpisodeLayoutResponse = {
  graphVersion: "graph-1", resolutionState: "resolved", coverageState: "complete", warnings: [],
  workId: "work", ordering: { id: "ordering", kind: "potokDefault", isDefault: true }, groups: [],
};
const resolved: ArmResolveResponse = {
  graphVersion: "graph-1", resolutionState: "resolved", coverageState: "complete", warnings: [],
  query: { provider: "tmdb", entityKind: "tv", value: "123" }, alternatives: [],
  work: { id: "work", kind: "series", defaultOrderingId: "ordering", displayTitle: null, providerReferences: [] },
};
const makeClient = () => ({
  resolveWork: vi.fn(async () => ({ status: 200, etag: null, graphVersion: "graph-1", body: resolved })),
  getEpisodeLayout: vi.fn(async () => ({ status: 200, etag: null, graphVersion: "graph-1", body: layout })),
});

describe("canonical correction layout", () => {
  it("loads the selected ordering directly without translating its identity through TMDB", async () => {
    const client = makeClient();
    const signal = new AbortController().signal;
    expect(await loadArmBindingLayout({ tmdbId: 123, type: "tv", workId: "work", orderingId: "ordering" }, client, "ru", signal)).toBe(layout);
    expect(client.resolveWork).not.toHaveBeenCalled();
    expect(client.getEpisodeLayout).toHaveBeenCalledWith("work", { ordering: "ordering", locale: "ru", signal });
  });

  it("resolves a legacy entry point to a real work before loading its default ordering", async () => {
    const client = makeClient();
    const signal = new AbortController().signal;
    await loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", signal);
    expect(client.resolveWork).toHaveBeenCalledWith({ provider: "tmdb", entityKind: "tv", value: "123" }, { locale: "ru", signal });
    expect(client.getEpisodeLayout).toHaveBeenCalledWith("work", { ordering: "default", locale: "ru", signal });
  });

  it.each(["ambiguous", "unresolved", "providerError"] as const)("does not turn a %s work response into selectable episode identities", async (resolutionState) => {
    const client = makeClient();
    client.resolveWork.mockResolvedValueOnce({ status: 200, etag: null, graphVersion: "graph-1", body: { ...resolved, resolutionState } });
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", new AbortController().signal)).rejects.toThrow("work identity");
    expect(client.getEpisodeLayout).not.toHaveBeenCalled();
  });

  it.each([
    { ...layout, workId: "other-work" },
    { ...layout, ordering: { id: "other-ordering", kind: "tmdb", isDefault: false } },
    { ...layout, ordering: null },
    { ...layout, resolutionState: "ambiguous" as const },
  ])("rejects a stale or unusable ordering", async (body) => {
    const client = makeClient();
    client.getEpisodeLayout.mockResolvedValueOnce({ status: 200, etag: null, graphVersion: "graph-1", body });
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv", workId: "work", orderingId: "ordering" }, client, "ru", new AbortController().signal)).rejects.toThrow("episode ordering");
  });

  it("discards a completed request if the user changed release while resolving the work", async () => {
    const controller = new AbortController();
    const client = makeClient();
    client.resolveWork.mockImplementationOnce(async () => {
      controller.abort();
      return { status: 200, etag: null, graphVersion: "graph-1", body: resolved };
    });
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(client.getEpisodeLayout).not.toHaveBeenCalled();
  });

  it("does not start a request after the editor has already closed", async () => {
    const controller = new AbortController();
    controller.abort();
    const client = makeClient();
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(client.resolveWork).not.toHaveBeenCalled();
    expect(client.getEpisodeLayout).not.toHaveBeenCalled();
  });
});
