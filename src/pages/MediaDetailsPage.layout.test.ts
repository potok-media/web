import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MediaDetailsPage layout", () => {
  it("keeps the existing hero and constrains the complete details page to the shared 2000px shell", () => {
    const page = readFileSync(new URL("./MediaDetailsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");

    expect(page).toContain("<MediaDetailsHeroSection");
    expect(page).toContain("details-content-grid");
    expect(styles).toContain("var(--wide-shell-max-width)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) clamp(22rem, 22vw, 26rem);");
  });

  it("uses a paginated three-row episode grid instead of the horizontal carousel and all-episodes popup", () => {
    const episodes = readFileSync(
      new URL("../components/SeasonEpisodesSection.tsx", import.meta.url),
      "utf8",
    );
    const pagination = readFileSync(
      new URL("../features/mediaDetails/episodePagination.ts", import.meta.url),
      "utf8",
    );

    expect(episodes).toContain('className="episodes-page-grid"');
    expect(episodes).toContain('className="episode-sort-trigger"');
    expect(episodes).toContain('className="episode-pagination"');
    expect(episodes).not.toContain("EpisodesListPopup");
    expect(episodes).not.toContain("episodes-scroll-viewport");
    expect(pagination).toContain("EPISODE_GRID_ROWS_PER_PAGE = 3");
  });

  it("uses the main column for movie cast rather than rendering an empty episode surface", () => {
    const page = readFileSync(new URL("./MediaDetailsPage.tsx", import.meta.url), "utf8");

    expect(page).toContain('hasEpisodeLibrary ? "details-content-grid--series" : "details-content-grid--movie"');
    expect(page).toContain('variant="wide"');
    expect(page).toContain('variant="compact"');
    expect(page).toContain("<MediaDetailsInfoSection");
    expect(page).toContain("<MediaRelatedSection");
  });
});
