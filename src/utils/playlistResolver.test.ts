import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PlaybackInfo } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";

const { sendSandboxRequest } = vi.hoisted(() => ({ sendSandboxRequest: vi.fn() }));

vi.mock("./extensions/ExtensionRegistry", () => ({
  ExtensionRegistry: { sendSandboxRequest: (...args: unknown[]) => sendSandboxRequest(...args) },
}));

import {
  clearPendingPlaylistResolver,
  clearPlaylistOverride,
  clearPlaylistResolver,
  consumePlaylistOverride,
  createSandboxPlaylistResolver,
  getPlaylistOverride,
  registerPendingPlaylistResolver,
  registerPlaylistResolver,
  resolvePlaylistItem,
  setPlaylistOverride,
} from "./playlistResolver";

const item: PlaylistItem = { id: "ep-1", season: 1, episode: 1, title: "One", streamUrl: "https://cdn.test/1.m3u8" };
const item2: PlaylistItem = { id: "ep-2", season: 1, episode: 2, title: "Two", streamUrl: "https://cdn.test/2.m3u8" };

function playback(overrides: Partial<ActivePlayback> = {}): ActivePlayback {
  return {
    streamUrl: "https://cdn.test/0.m3u8",
    title: "Show",
    mediaType: "tv",
    id: 42,
    instanceId: 7,
    playlist: [item, item2],
    ...overrides,
  };
}

const info: PlaybackInfo = { streamUrl: "https://cdn.test/next.m3u8", title: "Next" };

describe("playlistResolver", () => {
  beforeEach(() => {
    sendSandboxRequest.mockReset();
    clearPlaylistResolver(7);
    clearPlaylistResolver(8);
    clearPendingPlaylistResolver("test-owner");
    clearPendingPlaylistResolver("other-owner");
  });

  describe("resolvePlaylistItem", () => {
    it("uses the resolver registered for the playback instanceId", async () => {
      const resolver = vi.fn().mockResolvedValue(info);
      registerPlaylistResolver(7, resolver);

      const result = await resolvePlaylistItem(playback(), item2);

      expect(result).toBe(info);
      expect(resolver).toHaveBeenCalledWith(item2);
    });

    it("adopts a pending resolver on first use and reuses it afterwards", async () => {
      const resolver = vi.fn().mockResolvedValue(info);
      registerPendingPlaylistResolver("test-owner", resolver);

      await resolvePlaylistItem(playback(), item);
      await resolvePlaylistItem(playback(), item2);

      expect(resolver).toHaveBeenCalledTimes(2);
      // Pending slot is consumed — a different owner must not adopt it.
      clearPendingPlaylistResolver("other-owner");
      await resolvePlaylistItem(playback({ instanceId: 8 }), item);
      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it("does not let a foreign owner clear a pending resolver", async () => {
      const resolver = vi.fn().mockResolvedValue(info);
      registerPendingPlaylistResolver("test-owner", resolver);
      clearPendingPlaylistResolver("other-owner");

      const result = await resolvePlaylistItem(playback(), item);
      expect(result).toBe(info);
    });

    it("falls back to a sandbox request built from the playback providerId", async () => {
      sendSandboxRequest.mockResolvedValue(info);

      const result = await resolvePlaylistItem(
        playback({ providerId: "potok-online-balancers", sourceStream: { id: "stream-1" } }),
        item2,
      );

      expect(result).toBe(info);
      expect(sendSandboxRequest).toHaveBeenCalledWith(
        "potok-online-balancers",
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        expect.objectContaining({
          stream: { id: "stream-1" },
          episode: expect.objectContaining({ id: item2.id, url: item2.streamUrl }),
          episodes: expect.arrayContaining([expect.objectContaining({ id: item.id })]),
          context: { type: "tv", tmdbId: 42, title: "Show" },
        }),
      );
    });

    it("returns undefined when nothing can resolve the item", async () => {
      const result = await resolvePlaylistItem(playback(), item);
      expect(result).toBeUndefined();
      expect(sendSandboxRequest).not.toHaveBeenCalled();
    });
  });

  describe("createSandboxPlaylistResolver", () => {
    it("returns null without a playlist, sourceStream or pluginId", () => {
      expect(createSandboxPlaylistResolver(playback({ playlist: undefined }))).toBeNull();
      expect(createSandboxPlaylistResolver(playback({ sourceStream: undefined }))).toBeNull();
      expect(createSandboxPlaylistResolver(playback({ providerId: undefined }))).toBeNull();
    });

    it("uses the fallback pluginId when providerId is missing", async () => {
      sendSandboxRequest.mockResolvedValue(info);
      const resolver = createSandboxPlaylistResolver(playback({ sourceStream: { id: "s" } }), "fallback-plugin");

      expect(resolver).not.toBeNull();
      await resolver!(item);
      expect(sendSandboxRequest).toHaveBeenCalledWith("fallback-plugin", "STREAM_SOURCE_GET_PLAYBACK_INFO", expect.anything());
    });
  });

  describe("playlist override", () => {
    it("consumes the override exactly once", () => {
      const playlist = [item];
      setPlaylistOverride(playlist);

      expect(getPlaylistOverride()).toBe(playlist);
      expect(consumePlaylistOverride()).toBe(playlist);
      expect(consumePlaylistOverride()).toBeNull();
    });

    it("clears only the exact playlist instance it was given", () => {
      const playlist = [item];
      setPlaylistOverride(playlist);
      clearPlaylistOverride([item]);

      expect(getPlaylistOverride()).toBe(playlist);

      clearPlaylistOverride(playlist);
      expect(getPlaylistOverride()).toBeNull();
    });
  });
});
