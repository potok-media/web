import { useCallback } from "react";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";
import { isPlayableUrl } from "../utils/playableUrl";

/**
 * Player playlist navigation (R1): the player NEVER resolves content. Launching an item uses
 * the url it already carries — with a purely LOCAL voice pick from `item.audios` (the
 * session-remembered dub wins when it has a ready url). An item without a playable url is
 * dead: the caller surfaces the "no playable stream URL" error in the player UI.
 */
export function usePlayerPlaylist(
  playback: ActivePlayback | null,
  playVideo: (next: ActivePlayback) => void,
  options?: { getPreferredVoice?: () => string | null },
) {
  const getPreferredVoice = options?.getPreferredVoice;

  return useCallback(
    async (index: number) => {
      if (!playback || index < 0 || index >= playback.playlist.length) return;
      const item = playback.playlist[index];
      const itemTitle = item.season !== undefined && item.episode !== undefined
        ? `${item.title || ""} - S${item.season}E${item.episode}`
        : item.title || `Episode ${index + 1}`;

      const rememberedVoice = getPreferredVoice?.() ?? null;
      const norm = (value: unknown) =>
        typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "";
      const wantedVoice = norm(rememberedVoice) || norm(item.voice);
      let directUrl: string | null = isPlayableUrl(item.streamUrl) ? item.streamUrl : null;
      let directVoice: string | null = item.voice || null;
      if (Array.isArray(item.audios)) {
        const matched = item.audios.find(
          (audio) => isPlayableUrl(audio.url) && (norm(audio.voice) === wantedVoice || norm(audio.name) === wantedVoice),
        );
        const anyReady = matched ?? item.audios.find((audio) => isPlayableUrl(audio.url));
        if (anyReady && isPlayableUrl(anyReady.url)) {
          directUrl = anyReady.url;
          directVoice = anyReady.voice || anyReady.name || directVoice;
        }
      }
      if (!directUrl) {
        throw new Error(
          `Cannot start "${itemTitle}": the playlist item has no playable stream URL`,
        );
      }

      const nextItem: PlaylistItem = {
        ...item,
        streamUrl: directUrl,
        voice: directVoice || item.voice,
      };
      const nextPlayback: ActivePlayback = {
        ...playback,
        playlist: playback.playlist.map((entry, entryIndex) =>
          entryIndex === index ? nextItem : entry),
        playlistIndex: index,
        title: itemTitle,
        // The pre-built item has no segment metadata. Do not inherit the previous episode's cut.
        duration: undefined,
        introStart: undefined,
        introEnd: undefined,
        outroStart: undefined,
        outroEnd: undefined,
        subtitles: undefined,
        startAt: undefined,
      };
      playVideo(nextPlayback);
    },
    [playback, playVideo, getPreferredVoice],
  );
}
