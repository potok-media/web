import { useSyncExternalStore } from "react";

export type Anime4kUpscalePref = "auto" | "high" | "medium" | "light" | "off";

const STORAGE_KEY = "potok:anime4k-upscale";
const CHANGE_EVENT = "potok:anime4k-upscale-changed";

const PREF_VALUES: readonly string[] = ["auto", "high", "medium", "light", "off"];

export function getAnime4kUpscalePref(): Anime4kUpscalePref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return PREF_VALUES.includes(raw ?? "") ? (raw as Anime4kUpscalePref) : "auto";
  } catch {
    return "auto";
  }
}

export function setAnime4kUpscalePref(value: Anime4kUpscalePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage unavailable — the setting just doesn't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/**
 * Player "Anime upscale" setting. `auto` = ceiling high + anime detection; a concrete tier is
 * the ceiling with auto-downgrade still active; `off` disables the pipeline entirely.
 */
export function useAnime4kUpscalePref(): [Anime4kUpscalePref, (value: Anime4kUpscalePref) => void] {
  const value = useSyncExternalStore(subscribe, getAnime4kUpscalePref, () => "auto" as const);
  return [value, setAnime4kUpscalePref];
}
