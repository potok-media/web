import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Sparkles, BookOpen, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { MediaRow } from "../components/MediaRow";
import { LoadingSpinner } from "../components/LoadingSpinner";
import "../styles/actor.css";

interface ActorState {
  id?: number;
  name?: string;
  character?: string;
  profileSrc?: string;
}

const GENRES_CONFIG = [
  { id: "comedy", ids: [35], key: "actor.genre_35" },
  { id: "action_adventure", ids: [28, 12, 10759], key: "actor.genre_action_adventure" },
  { id: "drama", ids: [18], key: "actor.genre_18" },
  { id: "scifi_fantasy", ids: [878, 14, 10765], key: "actor.genre_scifi_fantasy" },
  { id: "thriller_horror", ids: [53, 27], key: "actor.genre_thriller_horror" },
  { id: "kids_family", ids: [10751, 16, 10762], key: "actor.genre_kids_family" },
];

export const ActorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation("media");

  // Retrieve basic info from navigation state as a fallback
  const state = location.state as ActorState | null;
  const actorId = id || state?.id?.toString() || "0";
  const actorNameFallback = state?.name || "Актёр";
  const profileSrcFallback = state?.profileSrc || "";

  const [loading, setLoading] = useState(true);
  const [actorDetails, setActorDetails] = useState<any>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    ApiClient.fetchPersonDetails(Number(actorId))
      .then((data) => {
        if (!active) return;
        setActorDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch actor details:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [actorId]);



  const handleBack = () => {
    navigate(-1);
  };

  const handleCardClick = (item: any) => {
    navigate(`/media/${item.mediaType}/${item.id}`);
  };

  const formatLifeDates = (birthday?: string, deathday?: string) => {
    if (!birthday) return "";

    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return "";

    const birthStr = birthDate.toLocaleDateString(i18n.language || "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (deathday) {
      const deathDate = new Date(deathday);
      if (!isNaN(deathDate.getTime())) {
        const deathStr = deathDate.toLocaleDateString(i18n.language || "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        let age = deathDate.getFullYear() - birthDate.getFullYear();
        const m = deathDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && deathDate.getDate() < birthDate.getDate())) {
          age--;
        }

        return `${birthStr} – ${deathStr} (${t("actor.ageAtDeath", { count: age })})`;
      }
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return `${birthStr} (${age} ${t("actor.years", { count: age })})`;
  };

  const getYear = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "" : date.getFullYear().toString();
  };

  const actorName = actorDetails?.name || actorNameFallback;
  
  const getProfileUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${ApiClient.baseURL}/media/tmdb/t/p/h632${path}`;
  };

  const profileSrc = getProfileUrl(actorDetails?.profile_path) || profileSrcFallback;
  const lifeDates = formatLifeDates(actorDetails?.birthday, actorDetails?.deathday);
  const placeOfBirth = actorDetails?.place_of_birth || "";
  const biography = actorDetails?.biography || "";

  // Filmography sections mapped to MediaRow
  const credits = actorDetails?.combined_credits;

  // Map helper to map array to media cards
  const mapToMediaCards = (itemsList: any[]) => {
    return itemsList.map((m) => ({
      id: m.id,
      title: m.title || m.name || "",
      originalTitle: m.original_title || m.original_name || "",
      posterSrc: m.poster_path ? `${ApiClient.baseURL}/media/tmdb/t/p/w342${m.poster_path}` : "",
      mediaType: m.media_type || "movie",
      tmdbRating: m.vote_average,
      subtitle: getYear(m.release_date || m.first_air_date),
    }));
  };

  const deduplicateCredits = (itemsList: any[]) => {
    const seen = new Set<string>();
    return itemsList.filter((m) => {
      const key = `${m.media_type || "movie"}-${m.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const allCastItems = useMemo(() => {
    if (!credits?.cast) return [];
    const sorted = (credits.cast as any[])
      .filter((m) => m.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return deduplicateCredits(sorted);
  }, [credits?.cast]);

  const castItems = useMemo(() => {
    return mapToMediaCards(allCastItems.slice(0, 20));
  }, [allCastItems]);

  const allDirectorItems = useMemo(() => {
    if (!credits?.crew) return [];
    const sorted = (credits.crew as any[])
      .filter((m) => m.job === "Director" && m.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return deduplicateCredits(sorted);
  }, [credits?.crew]);

  const directorItems = useMemo(() => {
    return mapToMediaCards(allDirectorItems.slice(0, 20));
  }, [allDirectorItems]);

  const allWriterItems = useMemo(() => {
    if (!credits?.crew) return [];
    const sorted = (credits.crew as any[])
      .filter((m) => (m.job === "Writer" || m.job === "Screenplay") && m.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return deduplicateCredits(sorted);
  }, [credits?.crew]);

  const writerItems = useMemo(() => {
    return mapToMediaCards(allWriterItems.slice(0, 20));
  }, [allWriterItems]);

  const allProducerItems = useMemo(() => {
    if (!credits?.crew) return [];
    const sorted = (credits.crew as any[])
      .filter((m) => m.job === "Producer" && m.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return deduplicateCredits(sorted);
  }, [credits?.crew]);

  const producerItems = useMemo(() => {
    return mapToMediaCards(allProducerItems.slice(0, 20));
  }, [allProducerItems]);

  // Dynamic genres mapping
  const genreSections = useMemo(() => {
    if (!credits?.cast) return [];

    return GENRES_CONFIG.map((genre) => {
      const matchingMovies = (credits.cast as any[])
        .filter((m) => m.poster_path && m.genre_ids?.some((gId: number) => genre.ids.includes(gId)))
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      const deduped = deduplicateCredits(matchingMovies);
      if (deduped.length < 3) return null;

      const allItemsMapped = mapToMediaCards(deduped);
      return {
        id: `genre-${genre.id}`,
        title: t(genre.key),
        items: allItemsMapped.slice(0, 20),
        allItems: allItemsMapped,
      };
    }).filter(Boolean) as Array<{ id: string; title: string; items: any[]; allItems: any[] }>;
  }, [credits?.cast]);

  const handleSeeAll = (sectionId: string, sectionTitle: string) => {
    let itemsToPass: any[] = [];
    if (sectionId === "cast") {
      itemsToPass = mapToMediaCards(allCastItems);
    } else if (sectionId === "director") {
      itemsToPass = mapToMediaCards(allDirectorItems);
    } else if (sectionId === "writer") {
      itemsToPass = mapToMediaCards(allWriterItems);
    } else if (sectionId === "producer") {
      itemsToPass = mapToMediaCards(allProducerItems);
    } else if (sectionId.startsWith("genre-")) {
      const genreSec = genreSections.find((g) => g.id === sectionId);
      if (genreSec) {
        itemsToPass = genreSec.allItems;
      }
    }

    navigate(`/library/actor-${actorId}-${sectionId}`, {
      state: {
        items: itemsToPass,
        title: t("actor.categoryTitle", { actorName, category: sectionTitle }),
      },
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="actor-details-layout" ref={containerRef}>
      {/* Immersive Blurred Backdrop using the actor's profile photo */}
      <div className="actor-hero-backdrop-container">
        {profileSrc && (
          <img src={profileSrc} className="actor-hero-backdrop" alt="" />
        )}
        <div className="actor-hero-overlay" />
      </div>

      <div className="actor-page-content-wrapper">
        <header className="actor-header-row">
          <button
            type="button"
            className="actor-circle-back-btn"
            onClick={handleBack}
          >
            <ArrowLeft size="1.25rem" />
          </button>
        </header>

        <div className="actor-main-info-section">
          <div className="actor-photo-column">
            <div className="actor-large-avatar-wrap">
              {profileSrc ? (
                <img src={profileSrc} alt={actorName} className="actor-large-photo" />
              ) : (
                <div className="actor-large-fallback">
                  <User size="5rem" />
                </div>
              )}
            </div>
          </div>

          <div className="actor-details-column">
            <h1 className="actor-full-name">{actorName}</h1>
            
            {lifeDates && (
              <p className="actor-meta-info-row">
                <Calendar size="1.125rem" className="actor-meta-icon" />
                <span>{lifeDates}</span>
              </p>
            )}

            {placeOfBirth && (
              <p className="actor-meta-info-row">
                <MapPin size="1.125rem" className="actor-meta-icon" />
                <span>{placeOfBirth}</span>
              </p>
            )}

            <div className="actor-badges-row">
              {actorDetails?.known_for_department && (
                <span className="actor-status-badge">
                  {t(`actor.${actorDetails.known_for_department}`)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Biography Block */}
        {biography && (
          <div className="actor-biography-section">
            <h2 className="actor-section-title">
              <BookOpen size="1.25rem" className="section-title-icon" />
              {t("actor.biography")}
            </h2>
            <div className="actor-biography-card">
              <p className="actor-biography-text">{biography}</p>
            </div>
          </div>
        )}

        {/* Filmography sections */}
        <div className="actor-bottom-section">
          {castItems.length > 0 && (
            <MediaRow
              id="cast"
              title={t("actor.asActor")}
              items={castItems}
              onCardClick={handleCardClick}
              onSeeAllClick={handleSeeAll}
            />
          )}

          {directorItems.length > 0 && (
            <MediaRow
              id="director"
              title={t("actor.director")}
              items={directorItems}
              onCardClick={handleCardClick}
              onSeeAllClick={handleSeeAll}
            />
          )}

          {writerItems.length > 0 && (
            <MediaRow
              id="writer"
              title={t("actor.writer")}
              items={writerItems}
              onCardClick={handleCardClick}
              onSeeAllClick={handleSeeAll}
            />
          )}

          {producerItems.length > 0 && (
            <MediaRow
              id="producer"
              title={t("actor.producer")}
              items={producerItems}
              onCardClick={handleCardClick}
              onSeeAllClick={handleSeeAll}
            />
          )}

          {/* Render dynamic genre sections */}
          {genreSections.map((sec) => (
            <MediaRow
              key={sec.id}
              id={sec.id}
              title={sec.title}
              items={sec.items}
              onCardClick={handleCardClick}
              onSeeAllClick={handleSeeAll}
            />
          ))}

          {castItems.length === 0 && directorItems.length === 0 && writerItems.length === 0 && producerItems.length === 0 && (
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
      </div>
    </div>
  );
};

export default ActorPage;
