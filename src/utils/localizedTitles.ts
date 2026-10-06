import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";

/**
 * Display-title hydration for index-backed cards: the Typesense document's title is a
 * search key, never a display title — the localized display title comes from TMDB through
 * the same deduped details cache the rest of the app uses. Cards without an index identity
 * (live-TMDB fallback results) arrive localized already and are skipped.
 */
export function hydrateLocalizedTitles(
  cards: MediaCard[],
  patch: (potokId: string, title: string) => void,
): void {
  for (const card of cards) {
    // A show-level title would overwrite every season/OVA of the same work. Entry documents
    // already carry their own source titles, so retain those until entry localization exists.
    if (card.titlesByLocale || card.entryId || !card.potokId || !(card.id > 0)) continue;
    void ApiClient.fetchMediaDetails(card.mediaType, card.id)
      .then(details => {
        if (details?.title && details.title !== card.title) patch(card.potokId!, details.title);
      })
      .catch(() => undefined); // a localized title is cosmetic; the card keeps the index title
  }
}
