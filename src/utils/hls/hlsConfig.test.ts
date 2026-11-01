import { describe, expect, it } from "vitest";
import { createHlsPlayerConfig } from "./hlsConfig";

describe("createHlsPlayerConfig stream headers", () => {
  it("installs xhrSetup replaying balancer headers on every request", () => {
    const config = createHlsPlayerConfig(0, { Referer: "https://kodik.cc/", "X-Token": "abc" });
    expect(typeof config.xhrSetup).toBe("function");

    const setHeaders: Record<string, string> = {};
    const xhr = {
      setRequestHeader(name: string, value: string) {
        setHeaders[name] = value;
      },
    };
    config.xhrSetup!(xhr as unknown as XMLHttpRequest, {} as never);
    expect(setHeaders).toEqual({ Referer: "https://kodik.cc/", "X-Token": "abc" });
  });

  it("skips forbidden header names instead of failing the request", () => {
    const config = createHlsPlayerConfig(0, { Referer: "https://kodik.cc/" });
    const xhr = {
      setRequestHeader(name: string) {
        if (name.toLowerCase() === "referer") throw new Error("Forbidden header");
      },
    };
    expect(() => config.xhrSetup!(xhr as unknown as XMLHttpRequest, {} as never)).not.toThrow();
  });

  it("omits xhrSetup when no headers are provided", () => {
    expect(createHlsPlayerConfig(0).xhrSetup).toBeUndefined();
    expect(createHlsPlayerConfig(0, {}).xhrSetup).toBeUndefined();
  });
});
