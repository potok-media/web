import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InlinePlayerSchema, UIComponentSchema } from "@potok/sdk-types";
import { HostInlinePlayerCase } from "./hostMediaCases";
import { ExtensionRegistry, type PresentedEpisodesPanel } from "../../../../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../../episodeSelector/types";

const playbackState = vi.hoisted(() => ({
  activePlayback: null as { mount?: string; playlist?: { id?: string }[]; playlistIndex?: number } | null,
}));

const watchTogetherState = vi.hoisted(() => ({
  role: null as "host" | "guest" | null,
  sessionActive: false,
}));

vi.mock("../../../../context/PlaybackContext", () => ({
  usePlayback: () => ({
    activePlayback: playbackState.activePlayback,
    stopVideo: vi.fn(),
    replacePlaylist: vi.fn(),
  }),
}));

vi.mock("react-i18next", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-i18next")>(),
  useTranslation: () => ({
    t: (key: string, options?: { number?: number }) => (
      options?.number !== undefined ? `${key}:${options.number}` : key
    ),
    i18n: { language: "ru" },
  }),
}));

vi.mock("../../../../network/ApiClient", () => ({
  ApiClient: { baseURL: "https://gateway.example" },
}));

vi.mock("../../../../context/watchTogetherState", () => ({
  useWatchTogether: () => watchTogetherState,
}));

vi.mock("../../../player/InlinePlayer", () => ({
  InlinePlayer: ({ playback }: { playback: { mount?: string } }) => createElement(
    "div",
    { "data-testid": "inline-player" },
    `inline:${playback.mount ?? "none"}`,
  ),
}));

const PANEL_PLUGIN_ID = "panel-plugin";
const sandboxWindow = { postMessage: vi.fn() } as unknown as Window;

const PANEL_EPISODES: GenericEpisodeItem[] = [
  { id: "episode-1", title: "Серия 1", url: "https://example.test/1.m3u8", audios: [] },
  { id: "episode-2", title: "Серия 2", url: "https://example.test/2.m3u8", audios: [] },
];

function presentEpisodes(panel: Partial<PresentedEpisodesPanel> = {}) {
  ExtensionRegistry.registerPresentedEpisodes(sandboxWindow, {
    title: "Очередь",
    episodes: PANEL_EPISODES,
    canReorder: true,
    onPlay: vi.fn(),
    onClose: vi.fn(),
    ...panel,
  });
}

describe("HostInlinePlayerCase", () => {
  beforeEach(() => {
    playbackState.activePlayback = null;
    watchTogetherState.role = null;
    watchTogetherState.sessionActive = false;
    ExtensionRegistry.registerSandbox(
      PANEL_PLUGIN_ID,
      { contentWindow: sandboxWindow } as unknown as HTMLIFrameElement,
    );
  });

  afterEach(() => {
    ExtensionRegistry.unregisterSandbox(PANEL_PLUGIN_ID);
  });

  it("renders the playback stage layout with plugin rail content", () => {
    const rail: UIComponentSchema = {
      id: "rail",
      type: "Text",
      props: { text: "Queue" },
    };
    const schema: InlinePlayerSchema = {
      id: "stage",
      type: "InlinePlayer",
      props: { backdropSrc: "https://example.test/backdrop.jpg" },
      children: [rail],
    };

    const html = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: "plugin",
      baseStyle: {},
      renderChild: () => createElement("aside", null, "Queue"),
    }));

    expect(html).toContain("sdk-inline-player");
    expect(html).toContain("streams-inline-workspace--split");
    expect(html).toContain("Queue");
  });

  it("embeds the InlinePlayer only while an inline playback is active", () => {
    const schema: InlinePlayerSchema = { id: "stage", type: "InlinePlayer", props: {} };

    playbackState.activePlayback = null;
    const empty = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: "plugin",
      baseStyle: {},
      renderChild: () => null,
    }));
    expect(empty).not.toContain('data-testid="inline-player"');

    playbackState.activePlayback = { mount: "overlay" };
    const overlay = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: "plugin",
      baseStyle: {},
      renderChild: () => null,
    }));
    expect(overlay).not.toContain('data-testid="inline-player"');

    playbackState.activePlayback = { mount: "inline" };
    const inline = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: "plugin",
      baseStyle: {},
      renderChild: () => null,
    }));
    expect(inline).toContain('data-testid="inline-player"');
  });

  it("fills the rail with the host episode panel built from presented episode data", () => {
    presentEpisodes();
    const schema: InlinePlayerSchema = { id: "stage", type: "InlinePlayer", props: {} };

    const html = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    expect(html).toContain("sdk-inline-player");
    expect(html).toContain("streams-inline-workspace--split");
    expect(html).toContain("sdk-episode-selector-panel");
    expect(html).toContain("episode-selector-content--playlist");
    expect(html).toContain("Серия 1");
    expect(html).toContain("Серия 2");
  });

  it("highlights the active episode from the playback playlist, not from plugin sync events", () => {
    presentEpisodes();
    // Player "next" moved the playlist — the panel follows playlistIndex alone.
    playbackState.activePlayback = {
      mount: "inline",
      playlist: [{ id: "episode-2" }, { id: "episode-1" }],
      playlistIndex: 0,
    };
    const schema: InlinePlayerSchema = { id: "stage", type: "InlinePlayer", props: {} };

    const html = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    // Display order follows the playlist (episode-2 first) and it carries the active highlight.
    expect(html.indexOf("Серия 2")).toBeLessThan(html.indexOf("Серия 1"));
    expect(html).toContain("is-active");
  });

  it("captions the active queue row as playing and the following one as next", () => {
    presentEpisodes();
    playbackState.activePlayback = {
      mount: "inline",
      playlist: [{ id: "episode-1" }, { id: "episode-2" }],
      playlistIndex: 0,
    };
    const schema: InlinePlayerSchema = { id: "stage", type: "InlinePlayer", props: {} };

    const html = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    // The playing caption sits under the current row's title, «Дальше» under the next one's.
    expect(html.indexOf("selector.playing")).toBeGreaterThan(html.indexOf("Серия 1"));
    expect(html.indexOf("selector.playing")).toBeLessThan(html.indexOf("Серия 2"));
    expect(html.indexOf("selector.next")).toBeGreaterThan(html.indexOf("Серия 2"));
  });

  it("offers the reorder handle to the host but never to a guest", () => {
    presentEpisodes();
    const schema: InlinePlayerSchema = { id: "stage", type: "InlinePlayer", props: {} };
    const renderRail = () => renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    watchTogetherState.role = "host";
    expect(renderRail()).toContain("file-card-drag-handle");

    watchTogetherState.role = "guest";
    expect(renderRail()).not.toContain("file-card-drag-handle");
  });

  it("prefers a schema-authored rail over presented episode data", () => {
    presentEpisodes();
    const schema: InlinePlayerSchema = {
      id: "stage",
      type: "InlinePlayer",
      props: {},
      children: [{ id: "rail", type: "Text", props: { text: "Queue" } }],
    };

    const html = renderToStaticMarkup(createElement(HostInlinePlayerCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => createElement("aside", null, "Queue"),
    }));

    expect(html).toContain("Queue");
    expect(html).not.toContain("Серия 1");
  });
});
