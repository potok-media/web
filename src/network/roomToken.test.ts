import { describe, it, expect } from "vitest";
import { generateRoomKey, buildShareToken, parseShareToken } from "./roomToken";

describe("roomToken", () => {
  it("generates a compact URL-safe 22-char key", () => {
    const key = generateRoomKey();
    expect(key.length).toBe(22);
    expect(/^[A-Za-z0-9_-]+$/.test(key)).toBe(true);
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateRoomKey()));
    expect(keys.size).toBe(100);
  });

  it("round-trips key + gateway url", () => {
    const key = generateRoomKey();
    const token = buildShareToken(key, "https://gw.example.com:5000/base");
    expect(parseShareToken(token)).toEqual({ roomKey: key, gatewayUrl: "https://gw.example.com:5000/base" });
  });

  it("stays far shorter than the raw key+url length", () => {
    const key = generateRoomKey();
    const url = "http://localhost:5001";
    const token = buildShareToken(key, url);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    expect(token).not.toContain("~");
    // packet = 16 + url bytes → base64url; well under the old decimal-key approach (~90+ chars).
    expect(token.length).toBeLessThan(56);
  });

  it("returns null for malformed / too-short tokens", () => {
    expect(parseShareToken("")).toBeNull();
    expect(parseShareToken(generateRoomKey())).toBeNull(); // 16 bytes only, no url payload
  });
});
