export type TopbarSearchIntent = "change" | "submit" | "clear" | "recent" | "show-all";

export function getTopbarSearchDestination(
  intent: TopbarSearchIntent,
  query: string,
): string | null {
  if (intent !== "show-all") return null;

  const trimmed = query.trim();
  return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : null;
}
