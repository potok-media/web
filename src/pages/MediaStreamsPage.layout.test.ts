import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MediaStreamsPage layout", () => {
  it("uses a centered 1400px shell with the media hero before the results", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");

    expect(page).toContain('className="streams-page-shell"');
    expect(page.indexOf("<StreamMediaHero")).toBeLessThan(page.indexOf("<StreamList"));
    expect(page).not.toContain("StreamSidebar");
    expect(styles).toContain("--streams-page-max-width: 87.5rem;");
    expect(styles).toContain("var(--streams-page-max-width)");
  });
});
