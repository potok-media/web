import { describe, expect, it, vi } from "vitest";
import { handlePluginSandboxMessage } from "./pluginSandboxMessageBridge";
import type { PluginSandboxMessageContext } from "./pluginSandboxTypes";

function context(providerId: string | null): PluginSandboxMessageContext {
  return {
    activeExtensions: [],
    activeProfile: null,
    activePlayback: providerId ? {
      streamUrl: "https://media.invalid/master.m3u8",
      title: "Example",
      mediaType: "tv",
      id: 1,
      providerId,
    } : null,
    showHUD: vi.fn(),
    playVideo: vi.fn(),
    stopVideo: vi.fn(),
    navigate: vi.fn(),
    setAccentTheme: vi.fn(),
    triggerPhysicalRemoval: vi.fn(),
    copyText: vi.fn(),
    openUrl: vi.fn(),
  };
}

describe("plugin sandbox STOP_VIDEO", () => {
  it("stops only the playback owned by the requesting plugin", async () => {
    const owner = context("potok-online-balancers");
    const stranger = context("another-plugin");
    const message = { source: "potok-plugin-sdk", action: "STOP_VIDEO", payload: {} };
    const source = { postMessage: vi.fn() } as unknown as MessageEventSource;

    await handlePluginSandboxMessage(owner, "potok-online-balancers", message, source);
    await handlePluginSandboxMessage(stranger, "potok-online-balancers", message, source);

    expect(owner.stopVideo).toHaveBeenCalledOnce();
    expect(stranger.stopVideo).not.toHaveBeenCalled();
  });
});
