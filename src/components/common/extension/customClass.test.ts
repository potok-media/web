import { describe, it, expect } from "vitest";
import { sanitizeClassName, sdkClass } from "./componentRendererUtils";
import type { UIComponentSchema } from "@potok/sdk-types";

const schema = (props: Record<string, unknown>) =>
  ({ type: "Card", id: "c", props } as unknown as UIComponentSchema);

describe("sanitizeClassName", () => {
  it("keeps well-formed class tokens", () => {
    expect(sanitizeClassName("my-card")).toBe("my-card");
    expect(sanitizeClassName("foo bar baz")).toBe("foo bar baz");
    expect(sanitizeClassName("  a   b  ")).toBe("a b");
    expect(sanitizeClassName("_private -leading")).toBe("_private -leading");
  });

  it("drops tokens that could smuggle selectors or CSS-breaking characters", () => {
    expect(sanitizeClassName(".evil")).toBeUndefined();
    expect(sanitizeClassName("a{color:red}")).toBeUndefined();
    expect(sanitizeClassName("a:hover")).toBeUndefined();
    expect(sanitizeClassName("a>b")).toBeUndefined();
    expect(sanitizeClassName("9leadingDigit")).toBeUndefined();
    expect(sanitizeClassName("safe .evil other")).toBe("safe other");
  });

  it("caps the number of tokens", () => {
    const result = sanitizeClassName("a b c d e f g h i j");
    expect(result?.split(" ")).toHaveLength(8);
  });

  it("rejects non-strings and empties", () => {
    expect(sanitizeClassName(undefined)).toBeUndefined();
    expect(sanitizeClassName(null)).toBeUndefined();
    expect(sanitizeClassName(42)).toBeUndefined();
    expect(sanitizeClassName("")).toBeUndefined();
    expect(sanitizeClassName("   ")).toBeUndefined();
  });
});

describe("sdkClass", () => {
  it("joins base classes with the marker and no custom class", () => {
    expect(sdkClass(schema({}), "potok-card")).toBe("potok-card potok-sdk-props");
  });

  it("appends the sanitized custom class from props.className", () => {
    expect(sdkClass(schema({ className: "my-card" }), "potok-card")).toBe(
      "potok-card potok-sdk-props my-card",
    );
  });

  it("filters out falsy base args (conditional classes)", () => {
    expect(sdkClass(schema({ className: "x" }), "base", false, undefined, "extra")).toBe(
      "base extra potok-sdk-props x",
    );
  });

  it("drops an unsafe custom class but keeps the marker", () => {
    expect(sdkClass(schema({ className: ".evil{}" }), "potok-card")).toBe(
      "potok-card potok-sdk-props",
    );
  });
});
