import { describe, expect, it } from "vitest";
import { withLanguageParam } from "./locale";

describe("withLanguageParam", () => {
  it("appends ?language= to a bare path", () => {
    expect(withLanguageParam("/api/library/continue-watching", "ru")).toBe(
      "/api/library/continue-watching?language=ru",
    );
  });

  it("appends &language= when a query string already exists", () => {
    expect(withLanguageParam("/api/library/status/by-status/watching?page=1&pageSize=50", "en")).toBe(
      "/api/library/status/by-status/watching?page=1&pageSize=50&language=en",
    );
  });

  it("encodes non-ascii languages", () => {
    expect(withLanguageParam("/api/x", "中文")).toBe(
      `/api/x?language=${encodeURIComponent("中文")}`,
    );
  });

  it("keeps a full URL intact", () => {
    expect(withLanguageParam("http://localhost:5000/api/library/folders", "ru")).toBe(
      "http://localhost:5000/api/library/folders?language=ru",
    );
  });
});
