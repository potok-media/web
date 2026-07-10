import { describe, it, expect } from "vitest";
import { sanitizeStyleValue, buildComponentBaseStyle } from "./componentRendererUtils";
import type { UIComponentSchema } from "@potok/sdk-types";

describe("sanitizeStyleValue", () => {
  it("allows safe colors, lengths and gradients", () => {
    expect(sanitizeStyleValue("#1e1e2e")).toBe("#1e1e2e");
    expect(sanitizeStyleValue("rgba(0,0,0,.4)")).toBe("rgba(0,0,0,.4)");
    expect(sanitizeStyleValue("linear-gradient(180deg, #000, #111)")).toBe("linear-gradient(180deg, #000, #111)");
    expect(sanitizeStyleValue("0.75rem")).toBe("0.75rem");
    expect(sanitizeStyleValue("var(--accent)")).toBe("var(--accent)");
  });

  it("rejects injection attempts", () => {
    expect(sanitizeStyleValue("red; position: fixed")).toBeUndefined();
    expect(sanitizeStyleValue("url(https://evil/x.png)")).toBeUndefined();
    expect(sanitizeStyleValue("url( javascript:alert(1) )")).toBeUndefined();
    expect(sanitizeStyleValue("expression(alert(1))")).toBeUndefined();
    expect(sanitizeStyleValue("}#foo{color:red")).toBeUndefined();
    expect(sanitizeStyleValue("</style>")).toBeUndefined();
    expect(sanitizeStyleValue("a".repeat(201))).toBeUndefined();
    expect(sanitizeStyleValue("")).toBeUndefined();
    expect(sanitizeStyleValue(undefined)).toBeUndefined();
  });
});

describe("buildComponentBaseStyle style tokens", () => {
  const schema = (props: Record<string, unknown>) =>
    ({ type: "Button", id: "b", props } as unknown as UIComponentSchema);

  it("maps sanitized tokens to inline style, clamps opacity", () => {
    const style = buildComponentBaseStyle(
      schema({ background: "#000", textColor: "#fff", borderColor: "#333", borderRadius: "1rem", shadow: "0 2px 4px #000", opacity: 2 }),
    );
    expect(style.background).toBe("#000");
    expect(style.color).toBe("#fff");
    expect(style.borderColor).toBe("#333");
    expect(style.borderStyle).toBe("solid");
    expect(style.borderRadius).toBe("1rem");
    expect(style.boxShadow).toBe("0 2px 4px #000");
    expect(style.opacity).toBe(1); // clamped 0..1
  });

  it("drops dangerous values", () => {
    const style = buildComponentBaseStyle(schema({ background: "red; position:fixed" }));
    expect(style.background).toBeUndefined();
  });
});
