import { useCallback, useEffect } from "react";
import type { PlaybackInfo } from "@potok/sdk-types";
import type { ActivePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";
import { isPlayableUrl } from "../utils/playableUrl";
import { clearPlaylistResolver, resolvePlaylistItem } from "../utils/playlistResolver";

export function usePlayerPlaylist(
  playback: ActivePlayback | null,
  playVideo: (next: ActivePlayback) => void,
  options?: { getPreferredVoice?: () => string | null },
) {
  const getPreferredVoice = options?.getPreferredVoice;
  // The resolver is keyed by playback.instanceId, so drop it when the playback
  // switches or closes — the next playVideo mints a fresh instanceId anyway.
  const instanceId = playback?.instanceId;
  useEffect(() => {
    return () => {
      if (instanceId !== undefined) clearPlaylistResolver(instanceId);
    };
  }, [instanceId]);

  return useCallback(
    async (index: number) => {
      if (!playback?.playlist || index < 0 || index >= playback.playlist.length) return;
      const item = playback.playlist[index];
      const itemTitle = item.season !== undefined && item.episode !== undefined
        ? `${item.title || ""} - S${item.season}E${item.episode}`
        : item.title || `Episode ${index + 1}`;

      // Ready content wins: when the plugin handed the item a playable streamUrl (resolved
      // window payload), the player just plays it — no resolver roundtrip at all. The voice
      // follows the session-remembered dub when the item carries per-candidate ready urls.
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
      if (directUrl) {
        const fallbackPlayback: ActivePlayback = {
          ...playback,
          streamUrl: directUrl,
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
          audios: item.audios,
          headers: item.headers ?? playback.headers,
          // The pre-built item has no segment metadata. Do not inherit the previous episode's cut.
          duration: undefined,
          introStart: undefined,
          introEnd: undefined,
          outroStart: undefined,
          outroEnd: undefined,
          voice: directVoice || item.voice || playback.voice,
          playlistIndex: index,
          startAt: undefined,
        };
        playVideo(fallbackPlayback);
        return;
      }

      try {
        // Session-remembered voice (the user explicitly switched dubs earlier in this playback):
        // override the item's default voice so the plugin resolves the remembered dub.
        const rememberedForResolve = getPreferredVoice?.() ?? null;
        const info: PlaybackInfo | null | undefined = await resolvePlaylistItem(
          playback,
          item,
          rememberedForResolve ? { voiceOverride: rememberedForResolve } : undefined,
        );
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
            audios: info.audios?.map((a) => ({
              name: a.name,
              url: a.url,
              // Keep the FULL candidate shape: cross-provider voices re-resolve through their
              // OWN provider (the plugin requires providerId/sourceId/query for that).
              label: a.label ?? null,
              voice: a.voice ?? null,
              providerId: a.providerId ?? null,
              sourceId: a.sourceId ?? null,
              query: a.query ?? null,
            })),
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
            voice: info.voice || item.voice || playback.voice,
            playlistIndex: index,
            startAt: undefined,
          };
          playVideo(nextPlayback);
          return;
        }
        if (info !== undefined) {
          logger.error(
            "[usePlayerPlaylist] resolver returned no playable streamUrl for item",
            item.id,
            info?.streamUrl,
          );
        }
      } catch (error) {
        // The resolver (plugin sandbox / bridge) usually knows the real reason — a failed
        // provider playback call, an unknown voice, a dead upstream. Surface it instead of
        // the misleading "no stream URL" fallback message.
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot start "${itemTitle}": ${reason}`, { cause: error });
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
    [playback, playVideo, getPreferredVoice],
  );
}
