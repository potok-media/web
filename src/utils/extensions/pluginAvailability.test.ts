import { afterEach, describe, expect, it, vi } from "vitest";
import { getPluginAvailability } from "./pluginAvailability";

function stubExtensions(value: unknown) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === "potok_extensions" ? JSON.stringify(value) : null),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPluginAvailability", () => {
  it("returns true for an installed and enabled plugin", () => {
    stubExtensions([{ id: "potok-online-balancers", enabled: true }]);
    expect(getPluginAvailability("potok-online-balancers")).toBe(true);
  });

  it("returns false when the plugin is absent from a readable list", () => {
    stubExtensions([{ id: "potok-torrents", enabled: true }]);
    expect(getPluginAvailability("potok-online-balancers")).toBe(false);
  });

  it("returns false when the plugin is installed but disabled", () => {
    stubExtensions([{ id: "potok-online-balancers", enabled: false }]);
    expect(getPluginAvailability("potok-online-balancers")).toBe(false);
  });

  it("returns undefined when the list is missing or unparsable (inconclusive)", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(getPluginAvailability("potok-online-balancers")).toBeUndefined();
    stubExtensions("not an array");
    expect(getPluginAvailability("potok-online-balancers")).toBeUndefined();
    stubExtensions(null);
    expect(getPluginAvailability("potok-online-balancers")).toBeUndefined();
  });

  it("returns undefined when localStorage itself throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
    });
    expect(getPluginAvailability("potok-online-balancers")).toBeUndefined();
  });
});
