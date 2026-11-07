import type { PlaybackInfo, PlaybackMetadata, StreamEpisode } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";
import type { ContinueResumePayload, MediaCard } from "../network/ApiTypes";
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
  /**
   * Installed/enabled lookup for the owning plugin (potok_extensions list).
   * true = available, false = known-missing → abort before any sandbox call,
   * undefined = inconclusive → attempt the sandbox call and surface its failure instead.
   */
  checkPluginAvailability?: (providerId: string) => boolean | undefined;
  playVideo: (playback: ActivePlayback) => void;
  enrichPlayback?: (patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => void;
}

/** Raised when the saved source's plugin is known to be uninstalled/disabled — resume must not touch the sandbox. */
export class ResumePluginUnavailableError extends Error {
  readonly providerId: string;

  constructor(providerId: string) {
    super(`Source unavailable: the plugin "${providerId}" is not installed`);
    this.name = "ResumePluginUnavailableError";
    this.providerId = providerId;
  }
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
 * A continue-watching card is resumable only when the server saved a source descriptor
 * (the player started attaching `lastSource` to progress saves).
 */
export function isCardResumable(card: MediaCard): boolean {
  return Boolean(card.resume?.lastSource?.providerId);
}

/**
 * Hero eligibility: rows at or past 90% of their duration are "досмотри последние 2 секунды"
 * noise, not "Сейчас смотрите" material — the episode-level endpoint already excludes them,
 * and the hero applies the same predicate to its title-level candidates. Rows without a
 * usable duration cannot be judged and stay eligible.
 */
export function isResumeEffectivelyComplete(
  resume: Pick<ContinueResumePayload, "progressSeconds" | "durationSeconds"> | null | undefined,
): boolean {
  const progressSeconds = Number(resume?.progressSeconds) || 0;
  const durationSeconds = Number(resume?.durationSeconds) || 0;
  return durationSeconds > 0 && progressSeconds >= durationSeconds * 0.9;
}

/**
 * Server payload → ledger-shaped cursor so the standard resume path can consume it:
 * torrents resolve through streamHash/fileIndex (file anchor first), online sources through
 * the opaque sourceStream round-trip into the owning plugin sandbox.
 */
export function resumeCursorFromCard(card: MediaCard): ContinueWatchingCursor | null {  const resume = card.resume;
  if (!resume) return null;
  const lastSource = resume.lastSource ?? {};
  const now = Date.now();
  return {
    key: card.potokId ? card.potokId : `tmdb:${card.id}`,
    workId: card.potokId,
    tmdbId: card.id,
    entryId: card.entryId,
    mediaType: card.mediaType,
    title: card.title,
    posterSrc: card.posterSrc,
    backdropSrc: card.backdropSrc,
    providerId: lastSource.providerId,
    streamHash: lastSource.streamHash,
    fileIndex: lastSource.fileIndex != null ? String(lastSource.fileIndex) : undefined,
    sourceStream: lastSource.sourceStream,
    audios: lastSource.audios,
    season: resume.season ?? undefined,
    episode: resume.episode ?? undefined,
    progressSeconds: Number(resume.progressSeconds) || 0,
    durationSeconds: Number(resume.durationSeconds) || 0,
    audioName: lastSource.voice,
    updatedAt: now,
  };
}

/**
 * Fills in the watch-progress overlay for cards the server didn't hydrate with a percentage —
 * /api/library/continue-watching returns the WatchProgress shape minus `percentage`, and the
 * resume payload alone is enough to render the bar. Server-provided fields (next episode pill)
 * are preserved.
 */
export function cardProgressFromResume(card: MediaCard): MediaCard {
  const resume = card.resume;
  if (!resume) return card;
  const existing = card.progress;
  if (existing && typeof existing.percentage === "number" && existing.percentage > 0) return card;
  const progressSeconds = Number(resume.progressSeconds) || 0;
  const durationSeconds = Number(resume.durationSeconds) || 0;
  const percentage = durationSeconds > 0
    ? Math.min(100, Math.round((progressSeconds / durationSeconds) * 100))
    : 0;
  if (percentage <= 0) return card;
  return {
    ...card,
    progress: {
      completed: existing?.completed ?? 0,
      aired: existing?.aired ?? 0,
      percentage,
      lastSeason: existing?.lastSeason ?? resume.season ?? undefined,
      lastEpisode: existing?.lastEpisode ?? resume.episode ?? undefined,
      ...(existing?.nextSeason !== undefined ? { nextSeason: existing.nextSeason } : {}),
      ...(existing?.nextEpisode !== undefined ? { nextEpisode: existing.nextEpisode } : {}),
    },
  };
}

/**
 * The ledger cursor backing a card, matched by ARM workId first then by tmdb id. Drives both the
 * lastSource backfill merge and the hero "Продолжить" fallback for server rows saved before the
 * player attached a source descriptor.
 */
export function findLedgerCursorForCard(
  card: Pick<MediaCard, "potokId" | "id">,
  ledger: ContinueWatchingCursor[],
): ContinueWatchingCursor | undefined {
  return ledger.find(
    (c) => (c.workId && c.workId === card.potokId) || (c.tmdbId != null && c.tmdbId === card.id),
  );
}

/**
 * Bridges the lastSource backfill gap: server rows saved before the player started attaching
 * lastSource carry no resume source, but this device may still hold the full cursor in its local
 * ledger — splice the ledger source into the card so the row stays resumable.
 *
 * TODO(lastSource-backfill): remove this merge (and the ledger fallback in the profile rail)
 * once progress saves have repopulated lastSource server-side.
 */
export function mergeLedgerLastSource(
  cards: MediaCard[],
  ledger: ContinueWatchingCursor[],
): MediaCard[] {
  if (!ledger.length) return cards;
  return cards.map((card) => {
    if (isCardResumable(card)) return card;
    const cursor = findLedgerCursorForCard(card, ledger);
    if (!cursor?.providerId) return card;
    return {
      ...card,
      resume: {
        ...(card.resume ?? {}),
        season: card.resume?.season ?? cursor.season,
        episode: card.resume?.episode ?? cursor.episode,
        progressSeconds: card.resume?.progressSeconds ?? cursor.progressSeconds,
        durationSeconds: card.resume?.durationSeconds ?? cursor.durationSeconds,
        lastSource: {
          providerId: cursor.providerId,
          ...(cursor.audioName ? { voice: cursor.audioName } : {}),
          ...(cursor.streamHash ? { streamHash: cursor.streamHash } : {}),
          ...(cursor.fileIndex != null ? { fileIndex: cursor.fileIndex } : {}),
          ...(cursor.sourceStream !== undefined ? { sourceStream: cursor.sourceStream } : {}),
        },
      },
    };
  });
}

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

  // Online sources (no torrent identity) die inside the plugin sandbox with a raw timeout or
  // "sandbox not active" when their plugin is gone. With a conclusive registry answer, fail
  // fast instead and let the host surface a proper "plugin not installed" notification.
  // An inconclusive lookup (undefined) falls through to the sandbox attempt by design.
  if (!cursor.streamHash) {
    const available = deps.checkPluginAvailability?.(providerId);
    if (available === false) {
      throw new ResumePluginUnavailableError(providerId);
    }
  }

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

  // The saved voice is part of the resume context: online sources bake the voice into the
  // resolved stream, so the resolve request must name it or the plugin returns the default dub.
  // The stored candidate list (cross-provider merge from the title page) travels with the
  // request so the plugin can match the voice among ALL candidates and re-resolve through the
  // candidate's own provider — the resolved PlaybackInfo then carries the full list for the menu.
  const episodeForResolve = cursor.audioName || cursor.audios
    ? { ...start, ...(cursor.audioName ? { voice: cursor.audioName } : {}), ...(cursor.audios ? { audios: cursor.audios } : {}) }
    : start;
  const info = await deps.requestPlaybackInfo(providerId, {
    stream: cursor.sourceStream,
    episode: episodeForResolve,
    context,
    episodes,
  });
  if (!info) throw new Error("Continue watching: the source returned no playback info");

  attachResumePlaylistResolver(cursor, context, episodes, deps);

  // Position restore: a file anchor (torrents) only keeps the position when the resolved file
  // is the same one; coordinate/plugin resumes have no file switch to guard against.
  const startAt = cursor.fileIndex != null
    ? (sameFile ? cursor.progressSeconds : 0)
    : cursor.progressSeconds;

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
      startAt,
      // The restore page hosts the player inline in its stage — never as a floating overlay.
      mount: "inline" as const,
    }),
  );
}
