import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MediaCard } from "../../network/ApiTypes";
import { MediaRow } from "../../components/MediaRow";
import type { ActorFilmographySection as FilmographySection } from "../../utils/actorFilmography";

interface ActorFilmographySectionProps {
  castSection: { preview: MediaCard[] };
  directorSection: { preview: MediaCard[] };
  writerSection: { preview: MediaCard[] };
  producerSection: { preview: MediaCard[] };
  genreSections: Array<FilmographySection & { title: string }>;
  hasFilmography: boolean;
  actorName: string;
  onCardClick: (item: MediaCard) => void;
  onSeeAll: (sectionId: string, sectionTitle: string) => void;
}

export const ActorFilmographySection: React.FC<ActorFilmographySectionProps> = ({
  castSection,
  directorSection,
  writerSection,
  producerSection,
  genreSections,
  hasFilmography,
  actorName,
  onCardClick,
  onSeeAll,
}) => {
  const { t } = useTranslation("media");

  return (
    <div className="actor-bottom-section">
      {castSection.preview.length > 0 && (
        <MediaRow
          id="cast"
          title={t("actor.asActor")}
          items={castSection.preview}
          onCardClick={onCardClick}
          onSeeAllClick={onSeeAll}
        />
      )}

      {directorSection.preview.length > 0 && (
        <MediaRow
          id="director"
          title={t("actor.director")}
          items={directorSection.preview}
          onCardClick={onCardClick}
          onSeeAllClick={onSeeAll}
        />
      )}

      {writerSection.preview.length > 0 && (
        <MediaRow
          id="writer"
          title={t("actor.writer")}
          items={writerSection.preview}
          onCardClick={onCardClick}
          onSeeAllClick={onSeeAll}
        />
      )}

      {producerSection.preview.length > 0 && (
        <MediaRow
          id="producer"
          title={t("actor.producer")}
          items={producerSection.preview}
          onCardClick={onCardClick}
          onSeeAllClick={onSeeAll}
        />
      )}

      {genreSections.map((sec) => (
        <MediaRow
          key={sec.id}
          id={sec.id}
          title={sec.title}
          items={sec.items}
          onCardClick={onCardClick}
          onSeeAllClick={onSeeAll}
        />
      ))}

      {!hasFilmography && (
        <div>
          <h2 className="actor-section-title">{t("actor.movies")}</h2>
          <div className="actor-films-placeholder">
            <Sparkles size="2rem" className="placeholder-icon" />
            <p className="placeholder-text-title">{t("actor.emptyFilmography")}</p>
            <p className="placeholder-text-desc">
              {t("actor.emptyFilmographyDesc", { name: actorName })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};