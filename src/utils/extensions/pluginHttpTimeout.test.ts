import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLUGIN_HTTP_TIMEOUT_MS,
  MAX_PLUGIN_HTTP_TIMEOUT_MS,
  TORRENT_SEARCH_HTTP_TIMEOUT_MS,
  formatSearchCountdown,
  resolvePluginHttpTimeout,
} from "./pluginHttpTimeout";

describe("resolvePluginHttpTimeout", () => {
  it("defaults to 15s", () => {
    expect(resolvePluginHttpTimeout("https://example.com/health")).toBe(DEFAULT_PLUGIN_HTTP_TIMEOUT_MS);
  });

  it("uses 90s for torrent search URLs", () => {
    expect(resolvePluginHttpTimeout("http://search.example/api/v1/torrents/search")).toBe(
      TORRENT_SEARCH_HTTP_TIMEOUT_MS,
    );
  });

  it("uses 90s for TorrentGo add/list files", () => {
    expect(resolvePluginHttpTimeout("http://127.0.0.1:5282/api/torrents")).toBe(
      TORRENT_SEARCH_HTTP_TIMEOUT_MS,
    );
    expect(resolvePluginHttpTimeout("http://127.0.0.1:5282/api/torrents/abc/files/0/metadata")).toBe(
      DEFAULT_PLUGIN_HTTP_TIMEOUT_MS,
    );
  });

  it("honors an explicit timeout and caps it", () => {
    expect(resolvePluginHttpTimeout("https://example.com", 8_000)).toBe(8_000);
    expect(resolvePluginHttpTimeout("https://example.com", 999_999)).toBe(MAX_PLUGIN_HTTP_TIMEOUT_MS);
  });
});

describe("formatSearchCountdown", () => {
  it("formats mm:ss", () => {
    expect(formatSearchCountdown(90)).toBe("1:30");
    expect(formatSearchCountdown(60)).toBe("1:00");
    expect(formatSearchCountdown(59)).toBe("0:59");
    expect(formatSearchCountdown(0)).toBe("0:00");
  });
});
