import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SearchPage layout", () => {
  it("uses the same centered width container as the library pages", () => {
    const source = readFileSync(new URL("./SearchPage.tsx", import.meta.url), "utf8");

    expect(source).toContain(
      'className="library-page-container library-page-container--collection search-page"',
    );
  });
});
