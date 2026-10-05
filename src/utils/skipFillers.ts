import { useSyncExternalStore } from "react";

const STORAGE_KEY = "potok:skip-fillers";
const CHANGE_EVENT = "potok:skip-fillers-changed";

export function getSkipFillers(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSkipFillers(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable — the toggle just doesn't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Shared "skip fillers" toggle state (playlist dropdown switch, transport, auto-advance). */
export function useSkipFillers(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSkipFillers, () => false);
  return [value, setSkipFillers];
}
