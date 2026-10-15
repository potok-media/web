import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ConnectedAccountsSettings layout", () => {
  const component = readFileSync(
    new URL("./ConnectedAccountsSettings.tsx", import.meta.url),
    "utf8",
  );
  const accountSettings = readFileSync(
    new URL("./AccountSettings.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../../styles/settings.css", import.meta.url),
    "utf8",
  );

  it("groups Telegram and Trakt into one connected accounts card", () => {
    expect(accountSettings).toContain("<ConnectedAccountsSettings />");
    expect(component).toContain('title={t("account.connectedAccountsTitle")}');
    expect(component).toContain("connected-account-row__icon--telegram");
    expect(component).toContain("connected-account-row__icon--trakt");
    expect(styles).toContain(".connected-account-row + .connected-account-row");
  });

  it("opens the existing Trakt device flow in an accessible modal", () => {
    expect(component).toContain("<Overlay");
    expect(component).toContain("accessibleModal");
    expect(component).toContain('presentation="modal"');
    expect(component).toContain("closeTraktModal");
  });

  it("stacks account actions below their descriptions on narrow screens", () => {
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain("grid-column: 2;");
    expect(styles).toContain("white-space: normal;");
  });
});
