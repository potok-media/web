import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { HeroItem } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
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

  const handleToggleWatchlist = useCallback(async (card: HeroItem["card"], index: number) => {
    if (!card) return;
    try {
      const original = !!watchlistStates[index];
      setWatchlistStates((prev) => ({ ...prev, [index]: !original }));
      if (original) {
        await SyncApiClient.removeSyncWatchlist(card.id.toString(), card.mediaType);
      } else {
        await SyncApiClient.addSyncWatchlist(card.id.toString(), card.mediaType);
      }
      showHUD("success", original ? t("watchlist.removed") : t("watchlist.added"));
    } catch {
      setWatchlistStates((prev) => ({ ...prev, [index]: card.isInWatchlist || false }));
      showHUD("error", t("watchlist.syncError"));
    }
  }, [watchlistStates, showHUD, t]);

  return { watchlistStates, handleToggleWatchlist };
}