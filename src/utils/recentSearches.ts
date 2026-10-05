const STORAGE_KEY = "potok:recent-searches";
const MAX_ENTRIES = 8;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(entry => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...getRecentSearches().filter(entry => entry.toLowerCase() !== trimmed.toLowerCase())];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ENTRIES)));
  } catch {
    // storage unavailable (private mode etc.) — recents simply don't persist
  }
}

export function removeRecentSearch(query: string): string[] {
  const next = getRecentSearches().filter(entry => entry !== query);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // see rememberSearch
  }
  return next;
}
