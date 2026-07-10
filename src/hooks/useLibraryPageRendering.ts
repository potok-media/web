import { useState, useEffect, useRef } from "react";

const RENDER_CHUNK = 36;

// How many cards were rendered per list, so a list restored from cache on back
// navigation renders tall enough for the saved scroll position to be reachable.
const visibleCountCache: Record<string, number> = {};

export function useLibraryPageRendering(
  itemsLength: number,
  collectionType: string,
  isSearchPage: boolean,
  query: string,
  hasMore: boolean,
  page: number,
  loading: boolean,
  loadingMore: boolean,
  loadNextPage: () => void,
) {
  const resetKey = `${collectionType}|${isSearchPage ? query : ""}`;
  const [visibleCount, setVisibleCount] = useState(() => visibleCountCache[resetKey] ?? RENDER_CHUNK);
  const renderSentinelRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(RENDER_CHUNK);
  }

  useEffect(() => {
    visibleCountCache[resetKey] = visibleCount;
  }, [resetKey, visibleCount]);

  useEffect(() => {
    if (visibleCount >= itemsLength) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + RENDER_CHUNK, itemsLength));
        }
      },
      { rootMargin: "600px" },
    );
    const el = renderSentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [visibleCount, itemsLength]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { rootMargin: "1200px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);

    return () => { if (currentSentinel) observer.unobserve(currentSentinel); };
  }, [hasMore, page, loading, loadingMore, loadNextPage, itemsLength, visibleCount]);

  return { visibleCount, renderSentinelRef, sentinelRef };
}