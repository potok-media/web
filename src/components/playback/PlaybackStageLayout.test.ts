import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackStageLayout } from "./PlaybackStageLayout";

const playbackState = vi.hoisted(() => ({
  activePlayback: null as { mount?: string } | null,
}));

const watchTogetherState = vi.hoisted(() => ({
  role: null as "host" | "guest" | null,
  sessionActive: false,
}));

vi.mock("../../context/PlaybackContext", () => ({
  usePlayback: () => ({
    activePlayback: playbackState.activePlayback,
  }),
}));

vi.mock("../../context/watchTogetherState", () => ({
  useWatchTogether: () => watchTogetherState,
}));

vi.mock("../watchTogether/WatchTogetherRail", () => ({
  WatchTogetherRail: ({ queue }: { queue: ReactNode }) => createElement(
    "div",
    { "data-testid": "co-watch-rail" },
    queue,
  ),
}));

describe("PlaybackStageLayout", () => {
  beforeEach(() => {
    playbackState.activePlayback = null;
    watchTogetherState.role = null;
    watchTogetherState.sessionActive = false;
  });

  it("owns the shared player stage and optional right rail", () => {
    const html = renderToStaticMarkup(createElement(PlaybackStageLayout, {
      backdropSrc: "https://example.test/backdrop.jpg",
      rail: createElement("aside", null, "Queue"),
    }, createElement("div", null, "Stage")));

    expect(html).toContain("playback-workspace");
    expect(html).toContain("streams-page-shell--split");
    expect(html).toContain("streams-inline-workspace--split");
    expect(html).toContain("streams-media-stage--preview");
    expect(html).toContain("Stage");
    expect(html).toContain("Queue");
  });

  it("derives the player stage surface from the mounted playback instead of a stageMode prop", () => {
    const source = readFileSync(new URL("./PlaybackStageLayout.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("stageMode?:");
    expect(source).toContain('activePlayback?.mount === "inline" ? "player" : "preview"');
    expect(source).not.toContain("registerPlayerPortalTarget");
    expect(source).not.toContain("playerPortalTarget");
    expect(source).toContain('className="streams-media-stage__surface"');
  });

  it("paints the black player surface only while an inline playback is mounted", () => {
    playbackState.activePlayback = { mount: "inline" };
    const withPlayer = renderToStaticMarkup(createElement(PlaybackStageLayout, null));
    expect(withPlayer).toContain("streams-media-stage--player");

    playbackState.activePlayback = { mount: "overlay" };
    const withOverlay = renderToStaticMarkup(createElement(PlaybackStageLayout, null));
    expect(withOverlay).toContain("streams-media-stage--preview");
  });

  it("switches every stage rail to the co-watch shell when the room becomes active", () => {
    playbackState.activePlayback = { mount: "inline" };
    watchTogetherState.role = "host";
    watchTogetherState.sessionActive = true;

    const html = renderToStaticMarkup(createElement(PlaybackStageLayout, {
      rail: createElement("aside", null, "Plugin queue"),
    }));

    expect(html).toContain('data-testid="co-watch-rail"');
    expect(html).toContain("Plugin queue");
  });
});
