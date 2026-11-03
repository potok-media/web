import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { HeroItem } from "../network/ApiTypes";
import { getUserData } from "../utils/userData";
import { useHUD } from "../context/useHUD";

export function useHeroWatchlist(heroItems: HeroItem[]) {
  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();
  const [watchlistStates, setWatchlistStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const states: Record<number, boolean> = {};
    heroItems.forEach((item, index) => {
      states[index] = !!item.card.isInWatchlist;
    });
    setWatchlistStates(states);
  }, [heroItems]);

  // Watchlist is the "planned" status now (the layer flips server/guest storage underneath).
  const handleToggleWatchlist = useCallback(async (card: HeroItem["card"], index: number) => {
    if (!card) return;
    const mediaType = card.mediaType === "tv" ? "tv" : "movie";
    try {
      const original = !!watchlistStates[index];
      setWatchlistStates((prev) => ({ ...prev, [index]: !original }));
      if (original) {
        await getUserData().clearStatus(card.id.toString(), mediaType);
      } else {
        await getUserData().setStatus({
          tmdbId: card.id.toString(),
          mediaType,
          status: "planned",
          label: card.title,
          posterPath: card.posterSrc,
        });
      }
      showHUD("success", original ? t("watchlist.removed") : t("watchlist.added"));
    } catch {
      setWatchlistStates((prev) => ({ ...prev, [index]: card.isInWatchlist || false }));
      showHUD("error", t("watchlist.syncError"));
    }
  }, [watchlistStates, showHUD, t]);

  return { watchlistStates, handleToggleWatchlist };
}
