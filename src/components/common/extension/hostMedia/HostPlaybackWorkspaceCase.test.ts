import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PlaybackWorkspaceSchema, UIComponentSchema } from "@potok/sdk-types";
import { HostPlaybackWorkspaceCase } from "./hostMediaCases";

vi.mock("../../../../context/PlaybackContext", () => ({
  usePlayback: () => ({ registerPlayerPortalTarget: vi.fn() }),
}));

describe("HostPlaybackWorkspaceCase", () => {
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
});
