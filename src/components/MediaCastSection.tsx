import React from "react";
import { Grid } from "./common/Grid";
import { Focusable } from "./common/TVNavigation";
import { PlatformManager } from "../utils/PlatformManager";

interface CastMember {
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
  if (!cast || cast.length === 0) return null;

  const isTV = PlatformManager.isTV();

  const renderCard = (c: CastMember, focused = false, ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} className={`cast-member-card ${focused ? "focused" : ""}`.trim()}>
      <div className="cast-photo-wrap">
        <img
          src={c.profileSrc || c.ProfileSrc || c.imageSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64"}
          alt={c.name || c.Name || "Actor"}
          className="cast-photo"
        />
      </div>
      <span className="cast-name">{c.name || c.Name || ""}</span>
      <span className="cast-role">{c.character || c.Character || c.role || ""}</span>
    </div>
  );

  return (
    <div className="details-fullwidth-section">
      <h2 className="carousel-title details-section-title">Актерский состав</h2>
      <Grid minWidth="110px" gap="var(--space-s)" className="cast-grid">
        {cast.slice(0, 10).map((c, i) =>
          isTV ? (
            <Focusable key={i} focusKey={`CAST_CARD_${i}`}>
              {({ ref, focused }) => renderCard(c, focused, ref)}
            </Focusable>
          ) : (
            <React.Fragment key={i}>{renderCard(c)}</React.Fragment>
          )
        )}
      </Grid>
    </div>
  );
});

export default MediaCastSection;
