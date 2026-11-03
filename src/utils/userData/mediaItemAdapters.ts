import { ApiClient } from "../../network/ApiClient";
import type { MediaCard } from "../../network/ApiTypes";
import { resolveTmdbImageUrl } from "../mediaUtils";
import type { UserFolderItem, UserStatusRecord } from "./types";

/**
 * User-data records carry a TMDB poster path; the shape (bare "/x.jpg" vs full URL) depends on
 * which implementation produced it, so accept both.
 */
export const tmdbPosterSrc = (posterPath?: string | null): string | undefined => {
  if (!posterPath) return undefined;
  if (/^https?:\/\//.test(posterPath)) return posterPath;
  return `https://image.tmdb.org/t/p/w500${posterPath.startsWith("/") ? posterPath : `/${posterPath}`}`;
};

/** Status list records are hydrated (server) or label-persisted (guest) — both fit a MediaCard. */
export function userStatusRecordToMediaCard(record: UserStatusRecord): MediaCard {
  const id = Number(record.tmdbId);
  // Hydrated server rows carry posterSrc (relative TMDB path or full URL) — resolve it through
  // the gateway image proxy exactly like the continue-watching cards; guests keep posterPath.
  const posterSrc = record.posterSrc
    ? resolveTmdbImageUrl(record.posterSrc, ApiClient.baseURL)
    : tmdbPosterSrc(record.posterPath);
  return {
    id: Number.isFinite(id) ? id : 0,
    title: record.title ?? "",
    posterSrc,
    mediaType: record.mediaType,
  };
}

/** Folder items only carry a display label by contract — cards render a poster placeholder. */
export function userFolderItemToMediaCard(item: UserFolderItem): MediaCard {
  const id = Number(item.tmdbId);
  return {
    id: Number.isFinite(id) ? id : 0,
    title: item.label ?? "",
    mediaType: item.mediaType,
  };
}
