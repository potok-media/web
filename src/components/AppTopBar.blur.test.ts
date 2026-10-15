import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AppTopBar backdrop", () => {
  it("keeps sticky positioning separate from the translucent blur layer", () => {
    const styles = readFileSync(new URL("../styles/topbar.css", import.meta.url), "utf8");
    const topbarRule = styles.match(/\.app-topbar\s*\{([\s\S]*?)\}/)?.[1] || "";
    const backdropRule = styles.match(/\.app-topbar::before\s*\{([\s\S]*?)\}/)?.[1] || "";
    const filterDeclarations = backdropRule
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(?:-webkit-)?backdrop-filter:/.test(line));

    expect(topbarRule).toContain("position: sticky;");
    expect(topbarRule).toContain("background: transparent;");
    expect(topbarRule).not.toContain("backdrop-filter:");
    expect(backdropRule).toContain('content: "";');
    expect(backdropRule).toContain("background: hsla(240, 8%, 7%, 0.72);");
    expect(backdropRule).toContain("backdrop-filter: blur(1.25rem) saturate(1.15);");
    expect(backdropRule).toContain("-webkit-backdrop-filter: blur(1.25rem) saturate(1.15);");
    expect(filterDeclarations).toEqual([
      "-webkit-backdrop-filter: blur(1.25rem) saturate(1.15);",
      "backdrop-filter: blur(1.25rem) saturate(1.15);",
    ]);
  });
});
