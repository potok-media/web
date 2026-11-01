import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackWorkspaceSchema, UIComponentSchema } from "@potok/sdk-types";
import { HostPlaybackWorkspaceCase } from "./hostMediaCases";
import { ExtensionRegistry, type PresentedEpisodesPanel } from "../../../../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../../episodeSelector/types";

const playbackState = vi.hoisted(() => ({
  activePlayback: null as { playlist?: { id?: string }[]; playlistIndex?: number } | null,
}));

const watchTogetherState = vi.hoisted(() => ({
  role: null as "host" | "guest" | null,
  sessionActive: false,
}));

vi.mock("../../../../context/PlaybackContext", () => ({
  usePlayback: () => ({ activePlayback: playbackState.activePlayback, registerPlayerPortalTarget: vi.fn() }),
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

describe("HostPlaybackWorkspaceCase", () => {
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

  it("renders plugin rail content through the shared host workspace", () => {
    const rail: UIComponentSchema = {
      id: "rail",
      type: "Text",
      props: { text: "Queue" },
    };
    const schema: PlaybackWorkspaceSchema = {
      id: "workspace",
      type: "PlaybackWorkspace",
      props: { backdropSrc: "https://example.test/backdrop.jpg", stageMode: "player" },
      children: [rail],
    };

    const html = renderToStaticMarkup(createElement(HostPlaybackWorkspaceCase, {
      schema,
      pluginId: "plugin",
      baseStyle: {},
      renderChild: () => createElement("aside", null, "Queue"),
    }));

    expect(html).toContain("sdk-playback-workspace");
    expect(html).toContain("streams-inline-workspace--split");
    expect(html).toContain("Queue");
  });

  it("fills the rail with the host episode panel built from presented episode data", () => {
    presentEpisodes();
    const schema: PlaybackWorkspaceSchema = {
      id: "workspace",
      type: "PlaybackWorkspace",
      props: { stageMode: "player" },
    };

    const html = renderToStaticMarkup(createElement(HostPlaybackWorkspaceCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    expect(html).toContain("sdk-playback-workspace");
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
      playlist: [{ id: "episode-2" }, { id: "episode-1" }],
      playlistIndex: 0,
    };
    const schema: PlaybackWorkspaceSchema = {
      id: "workspace",
      type: "PlaybackWorkspace",
      props: { stageMode: "player" },
    };

    const html = renderToStaticMarkup(createElement(HostPlaybackWorkspaceCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => null,
    }));

    // Display order follows the playlist (episode-2 first) and it carries the active highlight.
    expect(html.indexOf("Серия 2")).toBeLessThan(html.indexOf("Серия 1"));
    expect(html).toContain("is-active");
  });

  it("prefers a schema-authored rail over presented episode data", () => {
    presentEpisodes();
    const schema: PlaybackWorkspaceSchema = {
      id: "workspace",
      type: "PlaybackWorkspace",
      props: { stageMode: "player" },
      children: [{ id: "rail", type: "Text", props: { text: "Queue" } }],
    };

    const html = renderToStaticMarkup(createElement(HostPlaybackWorkspaceCase, {
      schema,
      pluginId: PANEL_PLUGIN_ID,
      baseStyle: {},
      renderChild: () => createElement("aside", null, "Queue"),
    }));

    expect(html).toContain("Queue");
    expect(html).not.toContain("Серия 1");
  });
});
