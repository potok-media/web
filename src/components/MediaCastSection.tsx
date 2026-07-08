import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Grid } from "./common/Grid";
import { Focusable } from "./common/TVNavigation";
import { PlatformManager } from "../utils/PlatformManager";

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
  const navigate = useNavigate();

  if (!cast || cast.length === 0) return null;

  const isTV = PlatformManager.isTV();

  const renderCard = (c: CastMember, focused = false, ref?: React.Ref<HTMLAnchorElement>) => {
    const actorId = c.id || 0;
    const actorName = c.name || c.Name || "";
    const profileSrc = c.profileSrc || c.ProfileSrc || c.imageSrc || "";
    const character = c.character || c.Character || c.role || "";

    return (
      <Link
        ref={ref}
        to={`/actor/${actorId}`}
        state={{ id: actorId, name: actorName, character, profileSrc }}
        className={`cast-member-card ${focused ? "focused" : ""}`.trim()}
      >
        <div className="cast-photo-wrap">
          <img
            src={profileSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64"}
            alt={actorName || "Actor"}
            className="cast-photo"
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
      <Grid minWidth="7.5rem" gap="var(--space-m)" className="cast-grid">
        {cast.slice(0, 10).map((c, i) => {
          const actorId = c.id || 0;
          const actorName = c.name || c.Name || "";
          const profileSrc = c.profileSrc || c.ProfileSrc || c.imageSrc || "";
          const character = c.character || c.Character || c.role || "";

          return isTV ? (
            <Focusable
              key={i}
              focusKey={`CAST_CARD_${i}`}
              onEnterPress={() => {
                navigate(`/actor/${actorId}`, {
                  state: { id: actorId, name: actorName, character, profileSrc }
                });
              }}
            >
              {({ ref, focused }) => renderCard(c, focused, ref)}
            </Focusable>
          ) : (
            <React.Fragment key={i}>{renderCard(c)}</React.Fragment>
          );
        })}
      </Grid>
    </div>
  );
});

export default MediaCastSection;
