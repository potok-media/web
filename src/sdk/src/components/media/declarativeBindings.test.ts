import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDeclarativeStreamListeners } from "./declarative-listeners";
import { registeredStreamSources, streamsSpace } from "./declarative-registry";

describe("canonical binding SDK bridge", () => {
  const postMessage = vi.fn();
  let dispatch: (event: { origin: string; data: unknown }) => Promise<void>;
  beforeEach(() => {
    registeredStreamSources.clear();
    postMessage.mockClear();
    vi.stubGlobal("window", {
      PotokInitialState: { hostOrigin: "https://potok.example" },
      parent: { postMessage },
      addEventListener: (_: string, listener: typeof dispatch) => { dispatch = listener; },
    });
    initDeclarativeStreamListeners();
  });
  afterEach(() => { vi.unstubAllGlobals(); registeredStreamSources.clear(); });

  const override = {
    fileId: "file-3", mode: "anchor",
    armTarget: { workId: "work", orderingId: "ordering", groupId: "ova", episodeId: "ova-1" },
    scopeFileIds: ["file-3", "file-5"],
  };
  const request = {
    source: "potok-host", action: "STREAM_SOURCE_SAVE_EPISODE_BINDING",
    payload: { requestId: "save-1", sourceId: "torrent", stream: { id: "release" }, context: { workId: "work" }, override },
  };

  it("advertises editing only when canonical save and reset are both available", () => {
    streamsSpace.registerStreamSource({ id: "torrent", search: () => [], saveEpisodeBinding: () => {}, clearFileOverride: () => {} });
    expect(postMessage.mock.calls[0][0].payload.capabilities).toEqual({ fileOverride: true, episodeBinding: true });
    streamsSpace.registerStreamSource({ id: "read-only", search: () => [] });
    expect(postMessage.mock.calls[1][0].payload.capabilities).toEqual({ fileOverride: false, episodeBinding: false });
  });

  it("delivers exact identity and file scope to the selected plugin and acknowledges its save", async () => {
    const save = vi.fn(async () => {});
    registeredStreamSources.set("torrent", { id: "torrent", search: () => [], saveEpisodeBinding: save });
    await dispatch({ origin: "https://potok.example", data: request });
    expect(save).toHaveBeenCalledWith(request.payload.stream, request.payload.context, override);
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: "STREAM_SOURCE_SAVE_EPISODE_BINDING_RESPONSE",
      payload: { requestId: "save-1", data: null, error: null },
    }), "https://potok.example");
  });

  it("reports failed writes, so the host cannot mistake them for a saved binding", async () => {
    registeredStreamSources.set("torrent", { id: "torrent", search: () => [], saveEpisodeBinding: async () => { throw new Error("Save failed"); } });
    await dispatch({ origin: "https://potok.example", data: request });
    expect(postMessage.mock.calls[0][0].payload.error).toBe("Save failed");
  });

  it("ignores a binding write sent by another origin", async () => {
    const save = vi.fn();
    registeredStreamSources.set("torrent", { id: "torrent", search: () => [], saveEpisodeBinding: save });
    await dispatch({ origin: "https://other.example", data: request });
    expect(save).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
