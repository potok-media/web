import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const getCssBlock = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return source.slice(start, end + 1);
};

describe("MediaStreamsPage scrolling", () => {
  it("keeps the torrent browser fixed while only the results list scrolls", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");
    const pageLayout = getCssBlock(styles, ".streams-page-layout--browser");
    const pageShell = getCssBlock(styles, ".streams-page-shell.streams-page-shell--browser");
    const browserContent = getCssBlock(styles, ".streams-page-content--browser");
    const resultsList = getCssBlock(
      styles,
      ".streams-page-content--browser .streams-results-list.scroll-view--vertical",
    );

    expect(page).toContain('workspaceMode ? "" : "streams-page-layout--browser"');
    expect(pageLayout).toContain("height: calc(100dvh - var(--topbar-height));");
    expect(pageLayout).toContain("overflow: hidden;");
    expect(pageShell).toContain("height: 100%;");
    expect(pageShell).toContain("overflow: hidden;");
    expect(browserContent).toContain("min-height: 0;");
    expect(browserContent).toContain("overflow: hidden;");
    expect(resultsList).toContain("overflow-y: auto;");
    expect(resultsList).toContain("overscroll-behavior: contain;");
  });
});
