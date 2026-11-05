import React, { useMemo } from "react";
import { usePlayback } from "../../context/PlaybackContext";
import { useWatchTogether } from "../../context/watchTogetherState";
import type { ActivePlayback } from "../../context/playbackTypes";
import type { GenericEpisodeItem } from "../common/episodeSelector/types";
import { EpisodeSelectorContent } from "../common/EpisodeSelectorContent";
import { usePlayerPlaylist } from "../../hooks/usePlayerPlaylist";
import { useSeasonEpisodes, buildSeasonStillMap } from "../../hooks/profile/useSeasonEpisodes";
import { ApiClient } from "../../network/ApiClient";
import { logger } from "../../utils/logger";

interface WatchTogetherQueuePanelProps {
  playback: ActivePlayback;
}

/**
 * Co-watch queue («Очередь») for the watch-together workspace. Rows come from the session descriptor's
 * playlist — for a guest that is the broadcast slim playlist (id/season/episode/title, no streamUrl), so
 * the panel is read-only: same EpisodeSelectorContent the host sees, minus the reorder handle, the
 * mapping edit, and the playlist-override arming. A row click only REQUESTS the episode: a permitted
 * guest asks the host, the host plays it directly.
 */
export const WatchTogetherQueuePanel: React.FC<WatchTogetherQueuePanelProps> = ({ playback }) => {
  const wt = useWatchTogether();
  const { activePlayback, playVideo } = usePlayback();
  const playPlaylistItem = usePlayerPlaylist(activePlayback, playVideo);

  // TMDB stills for the active season (tv only). Rows of other seasons stay title-only — one
  // fetch per (show, season), shared with every other consumer of the same hook.
  const playlistSeason =
    playback.mediaType === "tv"
      ? playback.season ?? playback.playlist?.find((item) => item.season != null)?.season
      : undefined;
  const seasonEpisodes = useSeasonEpisodes(
    playback.mediaType === "tv" && playback.id > 0 ? playback.id : undefined,
    playlistSeason,
  );
  const stills = useMemo(
    () => buildSeasonStillMap(seasonEpisodes, ApiClient.baseURL),
    [seasonEpisodes],
  );

  const episodes = useMemo<GenericEpisodeItem[]>(
    () => (playback.playlist ?? []).flatMap((item) =>
      item?.id != null && item.id !== ""
        ? [{
            id: String(item.id),
            season: item.season,
            episode: item.episode,
            title: item.title,
            audios: [],
            stillPath: item.season != null && item.episode != null
              ? stills.get(`${item.season}:${item.episode}`)
              : undefined,
          }]
        : [],
    ),
    [playback.playlist, stills],
  );

  const playlistIndex = playback.playlistIndex ?? -1;
  const activeEpisodeId = playlistIndex >= 0 ? episodes[playlistIndex]?.id : undefined;

  const handlePlay = (episode: GenericEpisodeItem) => {
    const index = episodes.findIndex((item) => item.id === episode.id);
    if (index < 0) return;
    if (wt.role === "guest") {
      // Guests don't switch episodes themselves — a permitted guest asks the host, who validates and
      // re-broadcasts; a guest without control permission gets an inert row.
      if (wt.sessionActive && wt.myPermissions.canControl) {
        wt.sendControl("episode", undefined, index);
      }
      return;
    }
    void playPlaylistItem(index).catch((error) => {
      logger.error("[WatchTogetherQueuePanel] playlist item playback failed:", error);
    });
  };

  if (episodes.length === 0) return null;

  return (
    <section className="torrent-files-panel" aria-label={playback.title || undefined}>
      <EpisodeSelectorContent
        isOpen
        onClose={() => undefined}
        title={playback.title || ""}
        episodes={episodes}
        onPlay={handlePlay}
        presentation="playlist"
        hideHeader
        activeEpisodeId={activeEpisodeId}
        mediaType={playback.mediaType}
        canReorder={false}
        publishPlaylistOverride={false}
      />
    </section>
  );
};

export default WatchTogetherQueuePanel;
