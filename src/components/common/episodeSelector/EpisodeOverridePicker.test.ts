import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EpisodeOverridePicker } from "./EpisodeOverridePicker";
import { EpisodeSelectorBody } from "./EpisodeSelectorBody";
import { EpisodeSelectorRow } from "./EpisodeSelectorRow";
import { buildEpisodeSourceSections } from "./utils";
import type { SDKArmEpisodeLayoutResponse } from "../../../sdk/src/types";

vi.mock("../../../network/ApiClient", () => ({ ApiClient: { baseURL: "https://gateway.example" } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({
  t: (key: string, options?: { number?: number }) => options?.number !== undefined ? `${key}:${options.number}` : key,
}) }));
const layout: SDKArmEpisodeLayoutResponse = {
  work: { id: "work" },
  graphVersion: "graph",
  groups: [{
    id: "ova", kind: "ova", number: 1, episodes: [{
      id: "ova-episode", number: 1,
      filler: { status: "filler", confidence: 1, disputed: false },
    }],
  }],
};
const legacySeasons = [{ seasonNumber: 1, episodes: [{ episodeNumber: 1, name: "Legacy episode" }] }];
const base = { seasons: legacySeasons, seasonsLoading: false, onApplyOverride: vi.fn() };

describe("ARM episode override picker states", () => {
  it("renders ARM ordinal and TMDB artwork while preserving provider coordinates", () => {
    const episodeItem = Object.freeze({
      id: "file", title: "TMDB special title", entryId: "specials", groupKind: "specials",
      displayOrdinal: "24.5", season: 0, episode: 7, stillPath: "/tmdb-still.jpg", audios: [],
    });
    const html = renderToStaticMarkup(createElement(EpisodeSelectorRow, { mediaType: "tv", onPlay: vi.fn(), episodeItem }));
    expect(html).toContain('class="file-card-bg-number">24.5');
    expect(html).toContain("TMDB special title");
    expect(html).toContain('src="https://gateway.example/media/tmdb/t/p/w500/tmdb-still.jpg"');
    expect(episodeItem.episode).toBe(7);
  });

  it("does not use TMDB numbers as fallback ARM titles or ordinals", () => {
    const html = renderToStaticMarkup(createElement(EpisodeSelectorRow, {
      mediaType: "tv", onPlay: vi.fn(), episodeItem: {
        id: "file", entryId: "cour", groupKind: "season", season: 7, episode: 12, audios: [],
      },
    }));
    expect(html).not.toContain('class="file-card-bg-number"');
    expect(html).not.toContain("episode.fallbackName:12");
    expect(html).not.toContain("selector.season:7");
  });

  it("uses the ARM group number for a row caption with a different TMDB projection", () => {
    const html = renderToStaticMarkup(createElement(EpisodeSelectorRow, {
      mediaType: "tv", onPlay: vi.fn(), episodeItem: {
        id: "file", entryId: "cour", groupKind: "season", groupDisplayNumber: 2,
        season: 7, episode: 12, audios: [],
      },
    }));
    expect(html).toContain("selector.season:2");
    expect(html).not.toContain("selector.season:7");
  });
  it("shows canonical loading without exposing the legacy list", () => {
    const html = renderToStaticMarkup(createElement(EpisodeOverridePicker, {
      ...base, canonicalBindingEnabled: true, armLayoutLoading: true,
    }));
    expect(html).toContain('role="status"');
    expect(html).toContain("override.armLoading");
    expect(html).not.toContain("Legacy episode");
  });

  it("shows a recoverable error and does not silently choose TMDB numbers", () => {
    const html = renderToStaticMarkup(createElement(EpisodeOverridePicker, {
      ...base, canonicalBindingEnabled: true, armLayoutError: true, onRetryArmLayout: vi.fn(),
    }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("override.armError");
    expect(html).toContain("common:actions.retry");
    expect(html).not.toContain("Legacy episode");
  });

  it("has a clear empty state if canonical layout has no usable identities", () => {
    const html = renderToStaticMarkup(createElement(EpisodeOverridePicker, {
      ...base, canonicalBindingEnabled: true, armLayout: { ...layout, groups: [] },
    }));
    expect(html).toContain("override.armEmpty");
    expect(html).not.toContain("Legacy episode");
  });

  it("renders OVA labels, canonical episode identity and filler badge", () => {
    const html = renderToStaticMarkup(createElement(EpisodeOverridePicker, {
      ...base, canonicalBindingEnabled: true, armLayout: layout, onApplyEpisodeBinding: vi.fn(),
    }));
    expect(html).toContain("seasons.ova");
    // The layout carries no titles (identity-only graph): the card renders the ordinal fallback.
    expect(html).toContain("episode.fallbackName:1");
    expect(html).toContain('data-episode-id="ova-episode"');
    expect(html).toContain("episode.annotationFiller");
    expect(html).toContain('type="search"');
  });

  it("keeps the legacy picker available for plugins without canonical binding", () => {
    expect(renderToStaticMarkup(createElement(EpisodeOverridePicker, base))).toContain("Legacy episode");
  });

  it("keeps existing numeric override reset available after a plugin enables canonical binding", () => {
    const html = renderToStaticMarkup(createElement(EpisodeSelectorBody, {
      mediaType: "tv", totalCount: 1, canonicalBindingEnabled: true,
      sourceSections: buildEpisodeSourceSections([{ id: "file", rawSeason: 1, season: 1, audios: [] }]),
      seasonMap: { "1": { season: 1, offset: 12 } }, onPlay: vi.fn(), onEditSection: vi.fn(), onResetOverride: vi.fn(),
    }));
    expect(html).toContain('aria-label="selector.resetSeasonMapping"');
    expect(html).toContain("season-map-badge");
    expect(html).toContain("+12");
  });
});
