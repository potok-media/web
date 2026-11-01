import type { PlaybackInfo, PlaybackMetadata, StreamEpisode } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";
import { buildPlaybackFromInfo } from "./mediaStreamsPlayback";
import type { StreamContext } from "../hooks/mediaStreams/mediaStreamsTypes";
import type { ContinueWatchingCursor } from "./continueWatching";
import { registerPendingPlaylistResolver } from "./playlistResolver";

/**
 * Host-side resume for the continue-watching ledger. Provider-agnostic: the cursor's providerId
 * names the owning plugin sandbox, episodes/playback-info are fetched through the standard
 * stream-source requests, so potok-torrents, potok-online-balancers and future sources all work.
 */

export interface ContinueResumeDeps {
  requestEpisodes: (
    providerId: string,
    stream: unknown,
    context: StreamContext,
  ) => Promise<{ episodes: StreamEpisode[] }>;
  requestPlaybackInfo: (
    providerId: string,
    args: { stream: unknown; episode: unknown; context: StreamContext; episodes?: unknown[] },
  ) => Promise<PlaybackInfo | null | undefined>;
  requestPlaybackMetadata?: (
    providerId: string,
    args: { stream: unknown; episode: unknown; context: StreamContext },
  ) => Promise<PlaybackMetadata | null | undefined>;
  playVideo: (playback: ActivePlayback) => void;
  enrichPlayback?: (patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => void;
}

export interface ResumeEpisodeMatch {
  id?: string | number;
  episodeId?: string | null;
  season?: number;
  episode?: number;
}

/** File anchor first, then ARM episode identity, then season/episode coordinates, then the premiere. */
export function pickResumeEpisode<T extends ResumeEpisodeMatch>(
  episodes: T[],
  cursor: Pick<ContinueWatchingCursor, "fileIndex" | "episodeId" | "season" | "episode">,
): T | undefined {
  if (!episodes.length) return undefined;
  if (cursor.fileIndex) {
    const byFile = episodes.find((ep) => String(ep.id) === String(cursor.fileIndex));
    if (byFile) return byFile;
  }
  if (cursor.episodeId) {
    const byEpisode = episodes.find((ep) => ep.episodeId === cursor.episodeId);
    if (byEpisode) return byEpisode;
  }
  if (cursor.season != null && cursor.episode != null) {
    const byCoordinates = episodes.find(
      (ep) => ep.season === cursor.season && ep.episode === cursor.episode,
    );
    if (byCoordinates) return byCoordinates;
  }
  return episodes[0];
}

/** Full playlist from the fresh episode list so in-player next/prev keeps working after resume. */
export function buildResumePlaylist(
  episodes: StreamEpisode[],
  providerId: string,
): PlaylistItem[] {
  return episodes.map((ep) => ({
    id: ep.id,
    workId: ep.workId,
    episodeId: ep.episodeId,
    entryId: ep.entryId,
    episodeIds: ep.episodeIds,
    targets: ep.targets,
    season: ep.season,
    episode: ep.episode,
    title: ep.title,
    streamUrl: ep.url || "",
    streamType: "m3u8",
    providerId,
  }));
}

const bridgeOwner = "continue-watching";

/**
 * Host playlist navigation (player next/prev, auto-advance) bypasses plugin code, so a resolver
 * must be parked for the resumed playback — same contract as mediaStreamsPlaylistBridge, but
 * owned by this flow so a later media-streams selection cleanly replaces it and vice versa.
 * The host playlist hook keys it to the playback's instanceId on first use.
 */
function attachResumePlaylistResolver(
  cursor: ContinueWatchingCursor,
  context: StreamContext,
  episodes: StreamEpisode[],
  deps: ContinueResumeDeps,
): void {
  const providerId = cursor.providerId;
  if (!providerId) return;
  registerPendingPlaylistResolver(bridgeOwner, (item: PlaylistItem) => {
    const episode = {
      id: item.id,
      workId: item.workId,
      episodeId: item.episodeId,
      entryId: item.entryId,
      episodeIds: item.episodeIds,
      targets: item.targets,
      season: item.season,
      episode: item.episode,
      title: item.title,
      url: item.streamUrl,
      providerId: item.providerId,
      audios: [],
    };
    const infoPromise = deps.requestPlaybackInfo(providerId, {
      stream: cursor.sourceStream,
      episode,
      context,
      episodes,
    });
    if (deps.requestPlaybackMetadata && deps.enrichPlayback) {
      Promise.all([infoPromise, deps.requestPlaybackMetadata(providerId, { stream: cursor.sourceStream, episode, context })])
        .then(([info, meta]) => {
          if (!info || !meta) return;
          deps.enrichPlayback!(
            { subtitles: meta.subtitles, duration: meta.duration },
            { streamHash: info.torrentHash, fileIndex: info.fileIndex },
          );
        })
        .catch(() => {
          // Background metadata enrichment is best-effort.
        });
    }
    return infoPromise;
  });
}

export async function resumeContinueWatching(
  cursor: ContinueWatchingCursor,
  deps: ContinueResumeDeps,
): Promise<void> {
  if (!cursor.providerId) {
    throw new Error("Continue watching: the saved item has no source plugin to resume from");
  }
  const providerId = cursor.providerId;
  const context: StreamContext = {
    type: cursor.mediaType,
    tmdbId: cursor.tmdbId ?? 0,
    title: cursor.title,
    workId: cursor.workId,
    entryId: cursor.entryId,
    episodeId: cursor.episodeId,
    season: cursor.season,
    episode: cursor.episode,
  };

  const res = await deps.requestEpisodes(providerId, cursor.sourceStream, context);
  const episodes = res?.episodes || [];
  if (!episodes.length) {
    throw new Error("Continue watching: the source has no playable files for this title");
  }

  const start = pickResumeEpisode(episodes, cursor);
  if (!start) throw new Error("Continue watching: no matching episode found");
  const sameFile = cursor.fileIndex != null && String(start.id) === String(cursor.fileIndex);

  const info = await deps.requestPlaybackInfo(providerId, {
    stream: cursor.sourceStream,
    episode: start,
    context,
    episodes,
  });
  if (!info) throw new Error("Continue watching: the source returned no playback info");

  attachResumePlaylistResolver(cursor, context, episodes, deps);

  const playlist = buildResumePlaylist(episodes, providerId);
  const playlistIndex = Math.max(0, episodes.indexOf(start));
  deps.playVideo(
    buildPlaybackFromInfo(info, {
      mediaType: cursor.mediaType,
      id: cursor.tmdbId ?? 0,
      title: cursor.title,
      originalTitle: cursor.title,
      posterSrc: cursor.posterSrc,
      backdropSrc: cursor.backdropSrc,
      providerId,
      season: cursor.season,
      episode: cursor.episode,
      workId: cursor.workId,
      episodeId: cursor.episodeId,
      entryId: cursor.entryId,
      playlist,
      playlistIndex,
      sourceStream: cursor.sourceStream,
      stillSrc: sameFile ? cursor.stillSrc : undefined,
      startAt: sameFile ? cursor.progressSeconds : 0,
    }),
  );
}
