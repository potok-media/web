import { describe, expect, it, vi } from "vitest";
import { loadArmBindingLayout } from "./armBindingLayout";
import type { ArmEpisodeLayoutResponse, ArmResolveResponse } from "../../network/ArmTypes";

const layout: ArmEpisodeLayoutResponse = {
  work: { id: "work" },
  graphVersion: "graph-1",
  groups: [{
    id: "entry-season-1",
    kind: "season",
    number: 1,
    episodes: [{ id: "episode-1", number: 1 }],
  }],
};
const resolved: ArmResolveResponse = {
  workId: "work",
  graphVersion: "graph-1",
};
const makeClient = () => ({
  resolveWork: vi.fn(async () => ({ status: 200, etag: null, graphVersion: "graph-1", body: resolved })),
  getEpisodeLayout: vi.fn(async () => ({ status: 200, etag: null, graphVersion: "graph-1", body: layout })),
});

describe("canonical correction layout", () => {
  it("loads the work layout directly without translating its identity through TMDB", async () => {
    const client = makeClient();
    const signal = new AbortController().signal;
    expect(await loadArmBindingLayout({ tmdbId: 123, type: "tv", workId: "work" }, client, "ru", signal)).toBe(layout);
    expect(client.resolveWork).not.toHaveBeenCalled();
    expect(client.getEpisodeLayout).toHaveBeenCalledWith("work", { locale: "ru", signal });
  });

  it("resolves a legacy entry point to a real work before loading its layout", async () => {
    const client = makeClient();
    const signal = new AbortController().signal;
    await loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", signal);
    expect(client.resolveWork).toHaveBeenCalledWith({ provider: "tmdb", entityKind: "tv", value: "123" }, { locale: "ru", signal });
    expect(client.getEpisodeLayout).toHaveBeenCalledWith("work", { locale: "ru", signal });
  });

  it("does not turn an unresolved work response into selectable episode identities", async () => {
    const client = makeClient();
    client.resolveWork.mockResolvedValueOnce({ status: 200, etag: null, graphVersion: "graph-1", body: { workId: null, graphVersion: "graph-1" } });
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv" }, client, "ru", new AbortController().signal)).rejects.toThrow("work identity");
    expect(client.getEpisodeLayout).not.toHaveBeenCalled();
  });

  it.each([
    { ...layout, work: { ...layout.work, id: "other-work" } },
    { ...layout, groups: [] },
  ])("rejects a stale or empty layout", async (body) => {
    const client = makeClient();
    client.getEpisodeLayout.mockResolvedValueOnce({ status: 200, etag: null, graphVersion: "graph-1", body });
    await expect(loadArmBindingLayout({ tmdbId: 123, type: "tv", workId: "work" }, client, "ru", new AbortController().signal)).rejects.toThrow("episode layout");
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
