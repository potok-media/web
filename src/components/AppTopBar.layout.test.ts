import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AppTopBar layout", () => {
  it("places the application menu before the Potok brand in the leading group", () => {
    const source = readFileSync(new URL("./AppTopBar.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/topbar.css", import.meta.url), "utf8");

    const leadingGroup = source.match(
      /<div className="app-topbar__leading">([\s\S]*?)<\/div>/,
    )?.[1];
    const actionsGroup = source.match(
      /<div className="app-topbar__actions">([\s\S]*?)<\/div>/,
    )?.[1];

    expect(leadingGroup).toBeDefined();
    expect(leadingGroup?.indexOf("<AppMenuPopover />")).toBeLessThan(
      leadingGroup?.indexOf('className="app-topbar__brand"') ?? -1,
    );
    expect(actionsGroup).not.toContain("<AppMenuPopover />");
    expect(styles).toContain(".app-topbar__leading {");
    expect(styles).toContain("grid-template-columns: minmax(7.5rem, 1fr) 2.25rem;");
    expect(styles).toContain("transform-origin: top left;");
  });
});
