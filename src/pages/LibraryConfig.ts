import { Clock, Heart, Bookmark } from "lucide-react";

export const CATEGORY_MAP: Record<string, { title: string; endpoint: string; icon: any; emptyText: string; emptySub: string }> = {
  "up-next": { 
    title: "Продолжить", 
    endpoint: "up-next", 
    icon: Clock, 
    emptyText: "Здесь будут фильмы и серии, которые вы начали смотреть", 
    emptySub: "История ваших просмотров начнется автоматически при запуске воспроизведения" 
  },
  "watchlist": { 
    title: "Запланировано", 
    endpoint: "watchlist", 
    icon: Bookmark, 
    emptyText: "Список ожидания пуст", 
    emptySub: "Добавляйте фильмы и сериалы в этот раздел, чтобы не забыть посмотреть их позже" 
  },
  "favorites": { 
    title: "Избранное", 
    endpoint: "favorites", 
    icon: Heart, 
    emptyText: "В Избранном пока ничего нет", 
    emptySub: "Отмечайте любимые тайтлы сердечком на экранах деталей для быстрого доступа" 
  },
  "history": { 
    title: "История просмотров", 
    endpoint: "history", 
    icon: Clock, 
    emptyText: "Вы еще ничего не посмотрели", 
    emptySub: "Здесь будет отображаться хронологическая лента завершенных фильмов и эпизодов" 
  },
};

export const DYNAMIC_CATEGORY_TITLES: Record<string, string> = {
  "movie.now-playing": "В кинотеатрах",
  "movie.trending-day": "Тренды дня",
  "movie.trending-week": "Тренды недели",
  "movie.upcoming": "Скоро выйдет",
  "movie.popular": "Популярные фильмы",
  "tv.popular": "Популярные сериалы",
  "movie.top-rated": "Лучшие фильмы",
  "tv.top-rated": "Лучшие сериалы"
};
