import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackWorkspace } from "./PlaybackWorkspace";

const watchTogetherState = vi.hoisted(() => ({
  role: null as "host" | "guest" | null,
  sessionActive: false,
}));

vi.mock("../../context/PlaybackContext", () => ({
  usePlayback: () => ({
    activePlayback: { instanceId: 1 },
    registerPlayerPortalTarget: vi.fn(),
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

describe("PlaybackWorkspace", () => {
  beforeEach(() => {
    watchTogetherState.role = null;
    watchTogetherState.sessionActive = false;
  });

  it("owns the shared player stage and optional right rail", () => {
    const html = renderToStaticMarkup(createElement(PlaybackWorkspace, {
      backdropSrc: "https://example.test/backdrop.jpg",
      rail: createElement("aside", null, "Queue"),
    }));

    expect(html).toContain("playback-workspace");
    expect(html).toContain("streams-page-shell--split");
    expect(html).toContain("streams-inline-workspace--split");
    expect(html).toContain("streams-media-stage--player");
    expect(html).toContain("Queue");
  });

  it("registers the global player portal target inside the shared stage", () => {
    const source = readFileSync(new URL("./PlaybackWorkspace.tsx", import.meta.url), "utf8");

    expect(source).toContain("registerPlayerPortalTarget");
    expect(source).toContain('ref={registerPlayerPortalTarget}');
    expect(source).toContain('className="streams-media-stage__surface"');
  });

  it("switches every workspace rail to the co-watch shell when the room becomes active", () => {
    watchTogetherState.role = "host";
    watchTogetherState.sessionActive = true;

    const html = renderToStaticMarkup(createElement(PlaybackWorkspace, {
      rail: createElement("aside", null, "Plugin queue"),
    }));

    expect(html).toContain('data-testid="co-watch-rail"');
    expect(html).toContain("Plugin queue");
  });
});
