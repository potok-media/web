import { useCallback } from "react";
import type { PlaybackInfo } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";
import { isPlayableUrl } from "../utils/playableUrl";

interface PlaylistResolveBridge {
  potok_playlist_resolve?: (item: PlaylistItem) => Promise<PlaybackInfo>;
}

export function usePlayerPlaylist(
  playback: ActivePlayback | null,
  playVideo: (next: ActivePlayback) => void,
) {
  return useCallback(
    async (index: number) => {
      if (!playback?.playlist || index < 0 || index >= playback.playlist.length) return;
      const item = playback.playlist[index];
      const itemTitle = item.season !== undefined && item.episode !== undefined
        ? `${item.title || ""} - S${item.season}E${item.episode}`
        : item.title || `Episode ${index + 1}`;

      const resolve = (window as PlaylistResolveBridge).potok_playlist_resolve;
      if (typeof resolve === "function") {
        try {
          const info = await resolve(item);
          if (info && isPlayableUrl(info.streamUrl)) {
            const st = info.streamType;
            const nextPlayback: ActivePlayback = {
              ...playback,
              streamUrl: info.streamUrl,
              streamType:
                st === "m3u8" || st === "hls" || st === "mp4" || st === "dash"
                  ? st
                  : undefined,
              streamHash: info.torrentHash,
              fileIndex: info.fileIndex,
              audios: info.audios?.map((a) => ({ name: a.name, url: a.url })),
              headers: info.headers,
              subtitles: info.subtitles,
              session: info.session,
              duration: info.duration,
              introStart: info.introStart,
              introEnd: info.introEnd,
              outroStart: info.outroStart,
              outroEnd: info.outroEnd,
              season: item.season,
              episode: item.episode,
              workId: item.workId,
              episodeId: item.episodeId,
              entryId: item.entryId,
              episodeIds: item.episodeIds,
              targets: item.targets,
              title: itemTitle,
              voice: item.voice || playback.voice,
              playlistIndex: index,
              startAt: undefined,
            };
            playVideo(nextPlayback);
            return;
          }
          logger.error(
            "[usePlayerPlaylist] resolver returned no playable streamUrl for item",
            item.id,
            info?.streamUrl,
          );
        } catch (error) {
          logger.error("[usePlayerPlaylist] playlist resolve failed:", error);
        }
      }

      // Pre-built fallback is only safe when it holds a directly loadable URL.
      // Plugin pseudo-URLs (online-balancers://…) are identifiers, not streams.
      if (!isPlayableUrl(item.streamUrl)) {
        throw new Error(
          `Cannot start "${itemTitle}": the playlist item has no playable stream URL`,
        );
      }

      const fallbackPlayback: ActivePlayback = {
        ...playback,
        streamUrl: item.streamUrl,
        streamType: item.streamType,
        streamHash: undefined,
        fileIndex: undefined,
        season: item.season,
        episode: item.episode,
        workId: item.workId,
        episodeId: item.episodeId,
        entryId: item.entryId,
        episodeIds: item.episodeIds,
        targets: item.targets,
        title: itemTitle,
        audios: item?.audios,
        headers: item.headers ?? playback.headers,
        // The pre-built item has no segment metadata. Do not inherit the previous episode's cut.
        duration: undefined,
        introStart: undefined,
        introEnd: undefined,
        outroStart: undefined,
        outroEnd: undefined,
        voice: item.voice || playback.voice,
        playlistIndex: index,
        startAt: undefined,
      };
      playVideo(fallbackPlayback);
    },
    [playback, playVideo],
  );
}
