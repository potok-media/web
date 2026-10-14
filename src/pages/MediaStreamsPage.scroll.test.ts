import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const getCssBlock = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return source.slice(start, end + 1);
};

describe("MediaStreamsPage scrolling", () => {
  it("lets the outer main-content scroller measure the complete torrent page", () => {
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");
    const pageLayout = getCssBlock(styles, ".streams-page-layout");
    const resultsList = getCssBlock(styles, ".streams-results-list.scroll-view--vertical");

    expect(pageLayout).toContain("flex: 0 0 auto;");
    expect(pageLayout).toContain("overflow-y: visible;");
    expect(pageLayout).not.toContain("overflow: clip;");
    expect(resultsList).toContain("overflow: visible;");
  });
});
