import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const getCssBlock = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return source.slice(start, end + 1);
};

describe("AppLayout width contract", () => {
  it("keeps the 2000px top bar stable when routes change scroll ownership", () => {
    const layoutStyles = readFileSync(new URL("../styles/layout.css", import.meta.url), "utf8");
    const topbarStyles = readFileSync(new URL("../styles/topbar.css", import.meta.url), "utf8");
    const mediaStyles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");
    const variables = readFileSync(new URL("../styles/variables.css", import.meta.url), "utf8");
    const mainContentRule = getCssBlock(layoutStyles, ".main-content");
    const topbarInnerRule = getCssBlock(topbarStyles, ".app-topbar__inner");

    expect(mainContentRule).toContain("overflow-y: auto;");
    expect(mainContentRule).toContain("scrollbar-gutter: stable;");
    expect(topbarInnerRule).toContain("var(--wide-shell-max-width)");
    expect(variables).toContain("--wide-shell-max-width: 125rem;");
    expect(mediaStyles).toContain("--streams-page-max-width: 100rem;");
  });
});
