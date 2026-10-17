import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpisodeSelectorSchema } from "@potok/sdk-types";
import { HostEpisodeSelectorCase } from "./hostMediaCases";

const watchTogetherState = vi.hoisted(() => ({
  role: null as "host" | "guest" | null,
  sessionActive: false,
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

const createSchema = (isOpen = true): EpisodeSelectorSchema => ({
  id: "plugin-queue",
  type: "EpisodeSelector",
  props: {
    isOpen,
    title: "Очередь",
    presentation: "panel",
    activeEpisodeId: "episode-2",
    canReorder: true,
    episodes: [
      { id: "episode-1", title: "Серия 1", url: "https://example.test/1.m3u8" },
      { id: "episode-2", title: "Серия 2", url: "https://example.test/2.m3u8" },
    ],
  },
  events: { onReorder: "reorder-callback" },
});

describe("HostEpisodeSelectorCase panel presentation", () => {
  beforeEach(() => {
    watchTogetherState.role = null;
    watchTogetherState.sessionActive = false;
  });

  it("renders the shared Potok playlist inline without a modal overlay", () => {
    const html = renderToStaticMarkup(createElement(HostEpisodeSelectorCase, {
      schema: createSchema(),
      pluginId: "plugin",
      baseStyle: {},
    }));

    expect(html).toContain("sdk-episode-selector-panel");
    expect(html).toContain("episode-selector-content--playlist");
    expect(html).toContain("file-card-drag-handle");
    expect(html).not.toContain("modal-overlay");
  });

  it("does not mount a closed inline panel", () => {
    const html = renderToStaticMarkup(createElement(HostEpisodeSelectorCase, {
      schema: createSchema(false),
      pluginId: "plugin",
      baseStyle: {},
    }));

    expect(html).toBe("");
  });

  it("hides the selector header below the shared co-watch tabs", () => {
    watchTogetherState.role = "host";
    watchTogetherState.sessionActive = true;

    const html = renderToStaticMarkup(createElement(HostEpisodeSelectorCase, {
      schema: createSchema(),
      pluginId: "plugin",
      baseStyle: {},
    }));

    expect(html).not.toContain("modal-header");
    expect(html).toContain("episode-selector-content--playlist");
  });
});
