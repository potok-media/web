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
  "tv.on-the-air": "categories.dynamic.onTheAir",
  "tv.airing-today": "categories.dynamic.airingToday",
  "movie.now-playing": "categories.dynamic.nowPlaying",
  "mood.friday-thrills": "categories.dynamic.fridayThrills",
  "mood.cozy-evening": "categories.dynamic.cozyEvening",
  "discover.hidden-gems": "categories.dynamic.hiddenGems",
  "genre.movie.27": "categories.dynamic.nightSession",
  "genre.movie.35": "categories.dynamic.comedyBreak",
  "genre.movie.878": "categories.dynamic.sciFiFuture",
  "genre.tv.10765": "categories.dynamic.sciFiSeries",
  "mood.nostalgia": "categories.dynamic.nostalgia90s",
  "discover.korean": "categories.dynamic.koreanHits",
  "movie.upcoming": "categories.dynamic.upcoming",
  "tv.top-rated": "categories.dynamic.topTv",
  "discover.anime": "categories.dynamic.anime",
  "movie.short-runtime": "categories.dynamic.shortRuntime",
};
