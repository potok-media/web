import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleShowEpisodeSelector } from "./episodeSelectorHelper";
import { ExtensionRegistry } from "./ExtensionRegistry";

const PLUGIN_ID = "episode-panel-plugin";
const postMessageMock = vi.fn();
const sandboxWindow = { postMessage: postMessageMock } as unknown as Window;

function lastPostedMessage() {
  return postMessageMock.mock.calls.at(-1)?.[0] as {
    source: string;
    action: string;
    payload: { callbackId: string; eventData: unknown };
  };
}

describe("handleShowEpisodeSelector panel presentation", () => {
  beforeEach(() => {
    ExtensionRegistry.registerSandbox(PLUGIN_ID, { contentWindow: sandboxWindow } as unknown as HTMLIFrameElement);
  });

  afterEach(() => {
    ExtensionRegistry.unregisterSandbox(PLUGIN_ID);
    vi.clearAllMocks();
  });

  it("stores presented episodes as data keyed by the presenting plugin", () => {
    handleShowEpisodePanel();

    const panel = ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID);
    expect(panel).toBeDefined();
    expect(panel?.title).toBe("Demo");
    expect(panel?.subtitle).toBe("2024");
    expect(panel?.canReorder).toBe(true);
    expect(panel?.episodes.map((episode) => episode.id)).toEqual(["episode-1", "episode-2"]);
  });

  it("routes panel interactions back to the plugin iframe as TRIGGER_UI_EVENT", () => {
    handleShowEpisodePanel();
    const panel = ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID)!;

    panel.onPlay?.({ id: "episode-2", title: "Серия 2", audios: [] }, "audio-1");
    expect(lastPostedMessage()).toEqual({
      source: "potok-host",
      action: "TRIGGER_UI_EVENT",
      payload: { callbackId: "cb-play", eventData: { episode: { id: "episode-2", title: "Серия 2", audios: [] }, audioId: "audio-1" } },
    });

    panel.onClose?.();
    expect(lastPostedMessage()?.payload).toEqual({ callbackId: "cb-close", eventData: {} });

    panel.onReorderEpisodes?.([
      { id: "episode-2", title: "Серия 2", audios: [] },
      { id: "episode-1", title: "Серия 1", audios: [] },
    ]);
    expect(lastPostedMessage()?.payload).toEqual({
      callbackId: "cb-reorder",
      eventData: [
        { id: "episode-2", title: "Серия 2", audios: [] },
        { id: "episode-1", title: "Серия 1", audios: [] },
      ],
    });
  });

  it("clears the panel when a panel payload arrives without episodes", () => {
    handleShowEpisodePanel();
    expect(ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID)).toBeDefined();

    handleShowEpisodeSelector({ presentation: "panel" }, sandboxWindow);

    expect(ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID)).toBeUndefined();
  });

  it("drops the panel when the plugin sandbox unregisters", () => {
    handleShowEpisodePanel();
    ExtensionRegistry.unregisterSandbox(PLUGIN_ID);

    expect(ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID)).toBeUndefined();
  });
});

function handleShowEpisodePanel() {
  handleShowEpisodeSelector({
    presentation: "panel",
    title: "Demo",
    subtitle: "2024",
    canReorder: true,
    episodes: [
      { id: "episode-1", title: "Серия 1", audios: [] },
      { id: "episode-2", title: "Серия 2", audios: [] },
    ],
    onPlayCallbackId: "cb-play",
    onCloseCallbackId: "cb-close",
    onReorderCallbackId: "cb-reorder",
  }, sandboxWindow);
}

describe("handleShowEpisodeSelector modal presentation", () => {
  it("keeps dispatching the host window event for the modal path", () => {
    const dispatched: Event[] = [];
    vi.stubGlobal("window", { dispatchEvent: (event: Event) => dispatched.push(event) });

    try {
      handleShowEpisodeSelector({
        title: "Demo",
        episodes: [{ id: "episode-1", title: "Серия 1", audios: [] }],
        onPlayCallbackId: "cb-play",
      }, sandboxWindow);

      expect(dispatched).toHaveLength(1);
      const event = dispatched[0] as CustomEvent;
      expect(event.type).toBe("potok:show-episode-selector");
      expect(event.detail.title).toBe("Demo");
      expect(typeof event.detail.onPlay).toBe("function");
      expect(ExtensionRegistry.getPresentedEpisodes(PLUGIN_ID)).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
