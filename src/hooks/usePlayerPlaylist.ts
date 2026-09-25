import { useCallback } from "react";
import type { PlaybackInfo } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/AppSettingsContext";

interface PlaylistResolveBridge {
  potok_playlist_resolve?: (item: PlaylistItem) => Promise<PlaybackInfo>;
}

export function usePlayerPlaylist(
  playback: ActivePlayback,
  playVideo: (next: ActivePlayback) => void,
) {
  return useCallback(
    async (index: number) => {
      if (!playback.playlist || index < 0 || index >= playback.playlist.length) return;
      const item = playback.playlist[index];
      const itemTitle = item.season !== undefined && item.episode !== undefined
        ? `${item.title || ""} - S${item.season}E${item.episode}`
        : item.title || `Episode ${index + 1}`;

      const resolve = (window as PlaylistResolveBridge).potok_playlist_resolve;
      if (typeof resolve === "function") {
        try {
          const info = await resolve(item);
          if (info) {
            const st = info.streamType;
            playVideo({
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
              orderingId: item.orderingId,
              groupId: item.groupId,
              episodeIds: item.episodeIds,
              targets: item.targets,
              title: itemTitle,
              voice: item.voice || playback.voice,
              playlistIndex: index,
              startAt: undefined,
            });
            return;
          }
        } catch {
          /* fall through to the stale pre-built item */
        }
      }

      playVideo({
        ...playback,
        streamUrl: item.streamUrl,
        streamType: item.streamType,
        streamHash: undefined,
        fileIndex: undefined,
        season: item.season,
        episode: item.episode,
        workId: item.workId,
        episodeId: item.episodeId,
        orderingId: item.orderingId,
        groupId: item.groupId,
        episodeIds: item.episodeIds,
        targets: item.targets,
        title: itemTitle,
        audios: item?.audios,
        // The pre-built item has no segment metadata. Do not inherit the previous episode's cut.
        duration: undefined,
        introStart: undefined,
        introEnd: undefined,
        outroStart: undefined,
        outroEnd: undefined,
        voice: item.voice || playback.voice,
        playlistIndex: index,
        startAt: undefined,
      });
    },
    [playback, playVideo],
  );
}
