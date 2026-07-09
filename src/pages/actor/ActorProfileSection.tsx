import React from "react";
import { ArrowLeft, Calendar, MapPin, BookOpen, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "../../components/ui";

interface ActorProfileSectionProps {
  actorName: string;
  profileSrc: string;
  lifeDates: string;
  placeOfBirth: string;
  departmentLabel: string | null;
  biography: string;
  onBack: () => void;
  children?: React.ReactNode;
}

export const ActorProfileSection: React.FC<ActorProfileSectionProps> = ({
  actorName,
  profileSrc,
  lifeDates,
  placeOfBirth,
  departmentLabel,
  biography,
  onBack,
  children,
}) => {
  const { t } = useTranslation("media");
  const { t: tCommon } = useTranslation("common");

  return (
    <>
      <div className="actor-hero-backdrop-container">
        {profileSrc && (
          <img src={profileSrc} className="actor-hero-backdrop" alt="" />
        )}
        <div className="actor-hero-overlay" />
      </div>

      <div className="actor-page-content-wrapper">
        <header className="actor-header-row">
          <IconButton
            className="actor-circle-back-btn"
            onClick={onBack}
            aria-label={tCommon("back")}
          >
            <ArrowLeft size="1.25rem" />
          </IconButton>
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
              {departmentLabel && (
                <span className="actor-status-badge">{departmentLabel}</span>
              )}
            </div>
          </div>
        </div>

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

        {children}
      </div>
    </>
  );
};