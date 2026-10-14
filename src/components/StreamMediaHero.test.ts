import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StreamMediaHero } from "./StreamMediaHero";
import type { MediaCard } from "../network/ApiTypes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const media: MediaCard = {
  id: 1,
  title: "Провожающая в последний путь Фрирен",
  originalTitle: "Sousou no Frieren",
  mediaType: "tv",
  bannerSrc: "/banner.jpg",
  backdropSrc: "/backdrop.jpg",
  posterSrc: "/poster.jpg",
  overview: "История путешествия после победы над Королём демонов.",
  imdbRating: 9.1,
  kpRating: 8.9,
  ageRating: "16+",
};

describe("StreamMediaHero", () => {
  it("places the media context above the torrent results in a wide banner", () => {
    const html = renderToStaticMarkup(createElement(StreamMediaHero, {
      media,
      onBack: vi.fn(),
    }));

    expect(html).toContain('class="streams-media-hero"');
    expect(html).toContain("/banner.jpg");
    expect(html).toContain(media.title);
    expect(html).toContain(media.originalTitle);
    expect(html).toContain(media.overview);
    expect(html).toContain('aria-label="actions.back"');
  });

  it("falls back to the poster when wide artwork is unavailable", () => {
    const html = renderToStaticMarkup(createElement(StreamMediaHero, {
      media: { ...media, bannerSrc: undefined, backdropSrc: undefined },
      onBack: vi.fn(),
    }));

    expect(html).toContain("/poster.jpg");
  });
});
