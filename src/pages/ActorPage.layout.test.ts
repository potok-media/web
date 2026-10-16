import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ActorPage layout", () => {
  it("constrains the complete actor content to the shared 2000px shell", () => {
    const page = readFileSync(new URL("./ActorPage.tsx", import.meta.url), "utf8");
    const profile = readFileSync(
      new URL("./actor/ActorProfileSection.tsx", import.meta.url),
      "utf8",
    );
    const styles = readFileSync(new URL("../styles/actor.css", import.meta.url), "utf8");

    expect(page).toContain("<ActorProfileSection");
    expect(profile).toContain('className="actor-page-content-wrapper"');
    expect(styles).toContain("var(--wide-shell-max-width)");
    expect(styles).toContain("margin-inline: auto;");
  });
});
