import type { HeroItem } from "../network/ApiTypes";

export function areHeroSpotlightsEqual(
  prevItems: HeroItem[],
  nextItems: HeroItem[],
): boolean {
  if (prevItems === nextItems) return true;
  if (prevItems.length !== nextItems.length) return false;
  for (let i = 0; i < prevItems.length; i++) {
    const a = prevItems[i];
    const b = nextItems[i];
    if (a.card.id !== b.card.id) return false;
    if (a.card.isInWatchlist !== b.card.isInWatchlist) return false;
  }
  return true;
}