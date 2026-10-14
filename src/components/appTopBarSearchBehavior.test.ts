import { describe, expect, it } from "vitest";
import {
  getTopbarSearchDestination,
  type TopbarSearchIntent,
} from "./appTopBarSearchBehavior";

describe("top-bar search navigation", () => {
  it("opens the search page only for the show-all action", () => {
    const passiveIntents: TopbarSearchIntent[] = ["change", "submit", "clear", "recent"];

    for (const intent of passiveIntents) {
      expect(getTopbarSearchDestination(intent, "  фрирен  ")).toBeNull();
    }

    expect(getTopbarSearchDestination("show-all", "  фрирен  ")).toBe(
      "/search?q=%D1%84%D1%80%D0%B8%D1%80%D0%B5%D0%BD",
    );
  });

  it("does not open an empty search results page", () => {
    expect(getTopbarSearchDestination("show-all", "   ")).toBeNull();
  });
});
