import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ScrollView } from "./common/ScrollView";

interface CastMember {
  id?: number;
  profileSrc?: string;
  ProfileSrc?: string;
  imageSrc?: string;
  name?: string;
  Name?: string;
  character?: string;
  Character?: string;
  role?: string;
}

interface MediaCastSectionProps {
  cast: CastMember[];
}

export const MediaCastSection: React.FC<MediaCastSectionProps> = React.memo(({ cast }) => {
  const { t } = useTranslation("media");

  if (!cast || cast.length === 0) return null;

  const renderCard = (c: CastMember) => {
    const actorId = c.id || 0;
    const actorName = c.name || c.Name || "";
    const profileSrc = c.profileSrc || c.ProfileSrc || c.imageSrc || "";
    const character = c.character || c.Character || c.role || "";

    return (
      <Link
        to={`/actor/${actorId}`}
        state={{ id: actorId, name: actorName, character, profileSrc }}
        className="cast-member-card"
      >
        <div className="cast-photo-wrap">
          <img
            src={profileSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64"}
            alt={actorName || "Actor"}
            className="cast-photo"
            loading="lazy"
          />
        </div>
        <span className="cast-name">{actorName}</span>
        <span className="cast-role">{character}</span>
      </Link>
    );
  };

  return (
    <div className="details-fullwidth-section cast-section">
      <h2 className="carousel-title details-section-title">{t("cast.title")}</h2>
      <ScrollView
        orientation="horizontal"
        className="cast-scroll-viewport"
        trackClassName="cast-scroll-container"
      >
        {cast.slice(0, 10).map((c, i) => (
          <React.Fragment key={i}>{renderCard(c)}</React.Fragment>
        ))}
      </ScrollView>
    </div>
  );
});

export default MediaCastSection;
