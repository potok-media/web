import { useEffect, useRef, useState } from "react";
import { ApiClient } from "../network/ApiClient";
import { useTranslation } from "react-i18next";
import { mediaCardKey } from "../utils/mediaLink";
import type { MediaCard, MediaSearchFacet, MediaSearchResponse } from "../network/ApiTypes";

const DEBOUNCE_MS = 150;

export interface MediaSearchState {
  results: MediaCard[];
  facets: MediaSearchFacet[];
  found: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
}

export interface MediaSearch extends MediaSearchState {
  loadMore: () => Promise<void>;
}

const EMPTY: MediaSearchState = {
  results: [], facets: [], found: 0, page: 1, hasMore: false,
  loading: false, loadingMore: false, loadMoreError: false,
};

function readPage(response: MediaSearchResponse, page: number): MediaSearchState {
  // Older gateways can return a bare array or an envelope without pagination. Keep those
  // cards usable, but do not request a second page that would repeat their first response.
  const compat = Array.isArray(response) ? response : response?.results;
  const cards: MediaCard[] = Array.isArray(compat) ? compat : [];
  return {
    ...EMPTY,
    results: cards,
    facets: Array.isArray(response?.facets) ? response.facets : [],
    found: typeof response?.found === "number" ? response.found : cards.length,
    page,
    hasMore: response?.hasMore === true && response.page === page && cards.length > 0,
  };
}

/** Server-localized, paged search. Query, type and language changes reset all pages. */
export function useMediaSearch(query: string, type?: string): MediaSearch {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [state, setState] = useState<MediaSearchState>(EMPTY);
  const requestRef = useRef<{ controller: AbortController; query: string; type?: string; language: string } | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const trimmed = query.trim();
    loadingMoreRef.current = false;
    if (!trimmed) {
      setState(EMPTY);
      return;
    }
    const controller = new AbortController();
    requestRef.current = { controller, query: trimmed, type, language };
    setState({ ...EMPTY, loading: true });
    const timer = setTimeout(async () => {
      try {
        const response = await ApiClient.searchMedia(trimmed, type, controller.signal, 1);
        if (controller.signal.aborted) return;
        const first = readPage(response, 1);
        setState(first);
      } catch {
        if (!controller.signal.aborted) setState(EMPTY);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (requestRef.current?.controller === controller) requestRef.current = null;
    };
  }, [query, type, language]);

  const loadMore = async () => {
    const request = requestRef.current;
    if (!request || request.query !== query.trim() || request.type !== type || request.language !== language
      || !state.hasMore || state.loading || loadingMoreRef.current) return;
    const { controller } = request;
    const page = state.page + 1;
    loadingMoreRef.current = true;
    setState(previous => ({ ...previous, loadingMore: true, loadMoreError: false }));
    try {
      const response = await ApiClient.searchMedia(request.query, type, controller.signal, page);
      if (controller.signal.aborted) return;
      const next = readPage(response, page);
      setState(previous => {
        const keys = new Set(previous.results.map(mediaCardKey));
        const additions = next.results.filter(card => {
          const key = mediaCardKey(card);
          if (keys.has(key)) return false;
          keys.add(key);
          return true;
        });
        return { ...next, results: [...previous.results, ...additions] };
      });
    } catch {
      if (!controller.signal.aborted) {
        setState(previous => ({ ...previous, loadingMore: false, loadMoreError: true }));
      }
    } finally {
      if (requestRef.current === request) loadingMoreRef.current = false;
    }
  };

  return { ...state, loadMore };
}
