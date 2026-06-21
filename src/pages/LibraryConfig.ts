import { Clock, Heart, Bookmark } from "lucide-react";

// Values are i18next keys (namespace "media"), resolved by the consumer (LibraryPage) via t().
export const CATEGORY_MAP: Record<string, { title: string; endpoint: string; icon: any; emptyText: string; emptySub: string }> = {
  "up-next": {
    title: "categories.upNext.title",
    endpoint: "up-next",
    icon: Clock,
    emptyText: "categories.upNext.empty",
    emptySub: "categories.upNext.emptySub",
  },
  "watchlist": {
    title: "categories.watchlist.title",
    endpoint: "watchlist",
    icon: Bookmark,
    emptyText: "categories.watchlist.empty",
    emptySub: "categories.watchlist.emptySub",
  },
  "favorites": {
    title: "categories.favorites.title",
    endpoint: "favorites",
    icon: Heart,
    emptyText: "categories.favorites.empty",
    emptySub: "categories.favorites.emptySub",
  },
  "history": {
    title: "categories.history.title",
    endpoint: "history",
    icon: Clock,
    emptyText: "categories.history.empty",
    emptySub: "categories.history.emptySub",
  },
};

export const DYNAMIC_CATEGORY_TITLES: Record<string, string> = {
  "movie.now-playing": "categories.dynamic.nowPlaying",
  "movie.trending-day": "categories.dynamic.trendingDay",
  "movie.trending-week": "categories.dynamic.trendingWeek",
  "movie.upcoming": "categories.dynamic.upcoming",
  "movie.popular": "categories.dynamic.popularMovies",
  "tv.popular": "categories.dynamic.popularTv",
  "movie.top-rated": "categories.dynamic.topMovies",
  "tv.top-rated": "categories.dynamic.topTv",
};
