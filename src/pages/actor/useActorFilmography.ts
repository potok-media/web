import { useMemo, useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { TFunction } from "i18next";
import type { MediaCard, PersonDetails } from "../../network/ApiTypes";
import {
  buildCastSection,
  buildCrewSection,
  buildGenreSections,
  mapCreditsToMediaCards,
} from "../../utils/actorFilmography";
import { GENRES_CONFIG } from "./actorTypes";

export function useActorFilmography(
  credits: PersonDetails["combined_credits"] | undefined,
  gatewayBaseUrl: string,
  actorId: number,
  actorName: string,
  navigate: NavigateFunction,
  t: TFunction,
) {
  const castSection = useMemo(
    () => buildCastSection(credits?.cast, gatewayBaseUrl),
    [credits?.cast, gatewayBaseUrl],
  );

  const directorSection = useMemo(
    () => buildCrewSection(credits?.crew, (job) => job === "Director", gatewayBaseUrl),
    [credits?.crew, gatewayBaseUrl],
  );

  const writerSection = useMemo(
    () =>
      buildCrewSection(
        credits?.crew,
        (job) => job === "Writer" || job === "Screenplay",
        gatewayBaseUrl,
      ),
    [credits?.crew, gatewayBaseUrl],
  );

  const producerSection = useMemo(
    () => buildCrewSection(credits?.crew, (job) => job === "Producer", gatewayBaseUrl),
    [credits?.crew, gatewayBaseUrl],
  );

  const genreSections = useMemo(
    () =>
      buildGenreSections(credits?.cast, GENRES_CONFIG, gatewayBaseUrl).map((section) => ({
        ...section,
        title: t(section.titleKey),
      })),
    [credits?.cast, gatewayBaseUrl, t],
  );

  const hasFilmography =
    castSection.preview.length > 0 ||
    directorSection.preview.length > 0 ||
    writerSection.preview.length > 0 ||
    producerSection.preview.length > 0;

  const handleSeeAll = useCallback(
    (sectionId: string, sectionTitle: string) => {
      let itemsToPass: MediaCard[] = [];

      if (sectionId === "cast") {
        itemsToPass = mapCreditsToMediaCards(castSection.all, gatewayBaseUrl);
      } else if (sectionId === "director") {
        itemsToPass = mapCreditsToMediaCards(directorSection.all, gatewayBaseUrl);
      } else if (sectionId === "writer") {
        itemsToPass = mapCreditsToMediaCards(writerSection.all, gatewayBaseUrl);
      } else if (sectionId === "producer") {
        itemsToPass = mapCreditsToMediaCards(producerSection.all, gatewayBaseUrl);
      } else if (sectionId.startsWith("genre-")) {
        const genreSec = genreSections.find((g) => g.id === sectionId);
        if (genreSec) itemsToPass = genreSec.allItems;
      }

      navigate(`/library/actor-${actorId}-${sectionId}`, {
        state: {
          items: itemsToPass,
          title: t("actor.categoryTitle", { actorName, category: sectionTitle }),
        },
      });
    },
    [
      actorId,
      actorName,
      castSection.all,
      directorSection.all,
      gatewayBaseUrl,
      genreSections,
      navigate,
      producerSection.all,
      t,
      writerSection.all,
    ],
  );

  return {
    castSection,
    directorSection,
    writerSection,
    producerSection,
    genreSections,
    hasFilmography,
    handleSeeAll,
  };
}