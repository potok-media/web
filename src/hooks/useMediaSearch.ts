import { useEffect, useRef, useState } from "react";
import { ApiClient } from "../network/ApiClient";
import { hydrateLocalizedTitles } from "../utils/localizedTitles";
import type { MediaCard, MediaSearchFacet } from "../network/ApiTypes";

const DEBOUNCE_MS = 150;

export interface MediaSearchState {
  results: MediaCard[];
  facets: MediaSearchFacet[];
  found: number;
  loading: boolean;
}

const EMPTY: MediaSearchState = { results: [], facets: [], found: 0, loading: false };

/**
 * Debounced search against the gateway (Typesense layer → live TMDB fallback). Every change
 * of query/type aborts the in-flight request, so the state always reflects the latest input.
 * An empty query short-circuits to the empty state without a request.
 */
export function useMediaSearch(query: string, type?: string): MediaSearchState {
  const [state, setState] = useState<MediaSearchState>(EMPTY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      setState(EMPTY);
      return;
    }

    setState(previous => ({ ...previous, loading: true }));
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await ApiClient.searchMedia(trimmed, type, controller.signal);
        if (controller.signal.aborted) return;
        // Version-skew tolerance: an older gateway answers a bare MediaCard[] without the
        // envelope — accept it as the results (no facets/highlights then), and treat any
        // other shape as an empty answer instead of crashing the render tree downstream.
        const compat = Array.isArray(response) ? response : response?.results;
        const cards = Array.isArray(compat) ? compat : [];
        setState({
          results: cards,
          facets: Array.isArray(response?.facets) ? response.facets : [],
          found: typeof response?.found === "number" ? response.found : 0,
          loading: false,
        });
        // Display titles hydrate from TMDB afterwards (index titles are search keys).
        hydrateLocalizedTitles(cards, (potokId, title) => {
          if (controller.signal.aborted) return;
          setState(previous => ({
            ...previous,
            results: previous.results.map(card => (card.potokId === potokId ? { ...card, title } : card)),
          }));
        });
      } catch {
        if (!controller.signal.aborted) {
          setState({ results: [], facets: [], found: 0, loading: false });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, type]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return state;
}
