import { useEffect, useState } from "react";
import type { ActivePlayback } from "../../context/playbackTypes";
import { getCurrentPlaylistItem } from "../../context/playbackTypes";
import { getArmEntriesCached } from "../../features/arm/armLayoutCache";
import { ApiClient } from "../../network/ApiClient";
import type { ArmEntryDetail } from "../../network/ArmTypes";

/** Anime-ness of an ARM work: any entry with anime display metadata or an anime external id. */
export function isAnimeEntries(entries: ArmEntryDetail[]): boolean {
  return entries.some(
    (entry) =>
      entry.displayMetadata != null ||
      (entry.externalIds ?? []).some((id) => id.entityKind === "anime"),
  );
}

/**
 * Playback-time anime detection: resolves the work's ARM entries through the shared layout
 * cache (the title page almost always warmed it, so this is usually a memory hit) and checks
 * for anime identity. Unbound playbacks (no workId) report false — users force those via the
 * manual upscale setting.
 */
export function useIsAnimePlayback(playback: ActivePlayback): boolean {
  const workId = getCurrentPlaylistItem(playback)?.workId ?? null;
  const [isAnime, setIsAnime] = useState(false);

  useEffect(() => {
    setIsAnime(false);
    if (!workId) return;
    let active = true;
    const locale = window.PotokInitialState?.language ?? "ru";
    getArmEntriesCached(workId, undefined, locale, (ifNoneMatch) =>
      ApiClient.getArmEntries(workId, { locale, ifNoneMatch }),
    )
      .then((response) => {
        if (active) setIsAnime(isAnimeEntries(response.entries));
      })
      .catch(() => {
        // Detection is advisory — a failed lookup just leaves upscaling off in "auto".
      });
    return () => {
      active = false;
    };
  }, [workId]);

  return isAnime;
}
