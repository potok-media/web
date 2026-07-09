import type { ActorGenreConfig } from "../../utils/actorFilmography";

export interface ActorState {
  id?: number;
  name?: string;
  character?: string;
  profileSrc?: string;
}

export const GENRES_CONFIG: ActorGenreConfig[] = [
  { id: "comedy", ids: [35], titleKey: "actor.genre_35" },
  { id: "action_adventure", ids: [28, 12, 10759], titleKey: "actor.genre_action_adventure" },
  { id: "drama", ids: [18], titleKey: "actor.genre_18" },
  { id: "scifi_fantasy", ids: [878, 14, 10765], titleKey: "actor.genre_scifi_fantasy" },
  { id: "thriller_horror", ids: [53, 27], titleKey: "actor.genre_thriller_horror" },
  { id: "kids_family", ids: [10751, 16, 10762], titleKey: "actor.genre_kids_family" },
];