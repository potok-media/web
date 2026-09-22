import type { ArmHttpResponse } from "../../network/ArmApiClient";
import type {
  ArmEpisodeLayoutResponse,
  ArmGraphVersion,
  ArmProviderReference,
  ArmResolveResponse,
  ArmWorkId,
} from "../../network/ArmTypes";

// Same 5-minute window as the legacy season cache: remounts within it reuse the payload without
// revalidating; past it we revalidate with If-None-Match and a 304 refreshes the entry cheaply.
const SOFT_TTL_MS = 300000;
const MAX_ENTRIES = 100;

interface ArmCacheEntry<T> {
  etag: string | null;
  graphVersion: ArmGraphVersion | null;
  payload: T;
  fetchedAt: number;
}

type ArmFetcher<T> = (ifNoneMatch?: string) => Promise<ArmHttpResponse<T>>;

const resolveCache = new Map<string, ArmCacheEntry<ArmResolveResponse>>();
const layoutCache = new Map<string, ArmCacheEntry<ArmEpisodeLayoutResponse>>();

export function armResolveCacheKey(reference: ArmProviderReference, locale: string): string {
  return `${reference.provider}/${reference.entityKind}/${reference.value}|${locale}`;
}

export function armLayoutCacheKey(workId: ArmWorkId, ordering: string, locale: string): string {
  return `${workId}|${ordering}|${locale}`;
}

function readFresh<T>(cache: Map<string, ArmCacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= SOFT_TTL_MS) return null;
  // LRU touch
  cache.delete(key);
  cache.set(key, entry);
  return entry.payload;
}

function write<T>(cache: Map<string, ArmCacheEntry<T>>, key: string, entry: ArmCacheEntry<T>): void {
  if (cache.has(key)) cache.delete(key);
  while (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  cache.set(key, entry);
}

async function getOrRevalidate<T>(
  cache: Map<string, ArmCacheEntry<T>>,
  key: string,
  fetcher: ArmFetcher<T>,
  forceRevalidate: boolean,
): Promise<T> {
  if (!forceRevalidate) {
    const fresh = readFresh(cache, key);
    if (fresh !== null) return fresh;
  }

  const stale = cache.get(key);
  const response = await fetcher(stale?.etag ?? undefined);

  if (response.status === 304) {
    if (!stale) throw new Error("ARM revalidation returned 304 without a cached payload");
    write(cache, key, { ...stale, fetchedAt: Date.now() });
    return stale.payload;
  }

  if (response.body === undefined) {
    throw new Error(`ARM request returned status ${response.status} without a payload`);
  }

  write(cache, key, {
    etag: response.etag,
    graphVersion: response.graphVersion,
    payload: response.body,
    fetchedAt: Date.now(),
  });
  return response.body;
}

export function getArmResolveCached(
  reference: ArmProviderReference,
  locale: string,
  fetcher: ArmFetcher<ArmResolveResponse>,
  forceRevalidate = false,
): Promise<ArmResolveResponse> {
  return getOrRevalidate(resolveCache, armResolveCacheKey(reference, locale), fetcher, forceRevalidate);
}

export function getArmLayoutCached(
  workId: ArmWorkId,
  ordering: string,
  locale: string,
  fetcher: ArmFetcher<ArmEpisodeLayoutResponse>,
  forceRevalidate = false,
): Promise<ArmEpisodeLayoutResponse> {
  return getOrRevalidate(layoutCache, armLayoutCacheKey(workId, ordering, locale), fetcher, forceRevalidate);
}

/** Test support: drop every cached resolve/layout entry. */
export function clearArmLayoutCaches(): void {
  resolveCache.clear();
  layoutCache.clear();
}
