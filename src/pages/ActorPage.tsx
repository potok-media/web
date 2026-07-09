import React, { useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useActorDetails } from "../hooks/useActorDetails";
import { formatActorLifeDates } from "../utils/actorLifeDates";
import { resolveActorDepartmentLabel } from "../utils/actorDepartment";
import { resolveProfileImageUrl } from "../utils/actorFilmography";
import { toIntlLocale } from "../utils/language";
import "../styles/actor.css";

import type { ActorState } from "./actor/actorTypes";
import { useActorFilmography } from "./actor/useActorFilmography";
import { ActorErrorState } from "./actor/ActorErrorState";
import { ActorProfileSection } from "./actor/ActorProfileSection";
import { ActorFilmographySection } from "./actor/ActorFilmographySection";

export const ActorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation("media");

  const state = location.state as ActorState | null;
  const actorId = Number(id ?? state?.id ?? 0);
  const actorNameFallback = state?.name ?? t("actor.nameFallback");
  const profileSrcFallback = state?.profileSrc ?? "";

  const { actorDetails, loading, error, refetch } = useActorDetails(actorId);
  const gatewayBaseUrl = ApiClient.baseURL;

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleCardClick = useCallback(
    (item: MediaCard) => navigate(`/media/${item.mediaType}/${item.id}`),
    [navigate],
  );

  const actorName = actorDetails?.name ?? actorNameFallback;

  const {
    castSection,
    directorSection,
    writerSection,
    producerSection,
    genreSections,
    hasFilmography,
    handleSeeAll,
  } = useActorFilmography(
    actorDetails?.combined_credits,
    gatewayBaseUrl,
    actorId,
    actorName,
    navigate,
    t,
  );

  const profileSrc =
    resolveProfileImageUrl(actorDetails?.profile_path, gatewayBaseUrl) ||
    profileSrcFallback;

  const departmentLabel = resolveActorDepartmentLabel(
    actorDetails?.known_for_department,
    t,
  );

  const lifeDates = formatActorLifeDates(
    actorDetails?.birthday,
    actorDetails?.deathday,
    toIntlLocale(i18n.language),
    {
      ageAtDeath: (age) => t("actor.ageAtDeath", { count: age }),
      years: (count) => t("actor.years", { count }),
    },
  );

  const placeOfBirth = actorDetails?.place_of_birth ?? "";
  const biography = actorDetails?.biography ?? "";

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="actor-details-layout actor-details-layout--error" ref={containerRef}>
        <ActorErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="actor-details-layout" ref={containerRef}>
      <ActorProfileSection
        actorName={actorName}
        profileSrc={profileSrc}
        lifeDates={lifeDates}
        placeOfBirth={placeOfBirth}
        departmentLabel={departmentLabel}
        biography={biography}
        onBack={handleBack}
      >
        <ActorFilmographySection
          castSection={castSection}
          directorSection={directorSection}
          writerSection={writerSection}
          producerSection={producerSection}
          genreSections={genreSections}
          hasFilmography={hasFilmography}
          actorName={actorName}
          onCardClick={handleCardClick}
          onSeeAll={handleSeeAll}
        />
      </ActorProfileSection>
    </div>
  );
};

export default ActorPage;