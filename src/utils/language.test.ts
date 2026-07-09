import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  bootstrapLanguageIfNeeded,
  detectInitialLanguage,
  getActiveLanguage,
  LANGUAGE_STORAGE_KEY,
  SOURCE_LANGUAGE,
} from "./language";

vi.mock("./StorageService", () => {
  const store = new Map<string, unknown>();
  return {
    Storage: {
      get: <T>(key: string, fallback: T): T =>
        (store.has(key) ? store.get(key) : fallback) as T,
      set: (key: string, value: unknown) => {
        store.set(key, value);
      },
      remove: (key: string) => {
        store.delete(key);
      },
    },
  };
});

const { Storage } = await import("./StorageService");

describe("language", () => {
  beforeEach(() => {
    Storage.remove(LANGUAGE_STORAGE_KEY);
  });

  it("detects browser language when storage is empty", () => {
    vi.stubGlobal("navigator", { language: "ru-RU" });
    expect(detectInitialLanguage(["en", "ru", "de"])).toBe("ru");
    vi.unstubAllGlobals();
  });

  it("persists detected language on bootstrap", () => {
    vi.stubGlobal("navigator", { language: "ru-RU" });
    const resolved = bootstrapLanguageIfNeeded(
      detectInitialLanguage(["en", "ru"]),
      ["en", "ru"],
    );
    expect(resolved).toBe("ru");
    expect(Storage.get(LANGUAGE_STORAGE_KEY, "")).toBe("ru");
    expect(getActiveLanguage()).toBe("ru");
    vi.unstubAllGlobals();
  });

  it("keeps saved preference over browser language", () => {
    Storage.set(LANGUAGE_STORAGE_KEY, "de");
    vi.stubGlobal("navigator", { language: "ru-RU" });
    expect(detectInitialLanguage(["en", "ru", "de"])).toBe("de");
    vi.unstubAllGlobals();
  });

  it("falls back to English for unsupported browser language", () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    expect(detectInitialLanguage(["en", "ru"])).toBe(SOURCE_LANGUAGE);
    vi.unstubAllGlobals();
  });
});