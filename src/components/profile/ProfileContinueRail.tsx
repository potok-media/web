import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { MediaCard } from "../../network/ApiTypes";
import { MediaCardComponent } from "../MediaCardComponent";
import { ScrollView } from "../common/ScrollView";
import { mediaCardKey } from "../../utils/mediaLink";

interface ProfileContinueRailProps {
  cards: MediaCard[];
  onResume: (card: MediaCard) => void;
}

/**
 * Profile "Продолжить просмотр" rail — server-driven cards (guests: local ledger) with the
 * episode pill + progress bar. Card clicks resume through the card's saved source descriptor.
 */
export const ProfileContinueRail: React.FC<ProfileContinueRailProps> = ({ cards, onResume }) => {
  const { t } = useTranslation("media");

  if (!cards.length) return null;

  return (
    <section className="carousel-container profile-continue-rail">
      <div className="carousel-header">
        <Link to="/library/continue" className="carousel-title-link" title={t("row.seeAllTitle", { title: t("home.continueWatching") })}>
          <h2 className="carousel-title">{t("home.continueWatching")}</h2>
          <ChevronRight className="carousel-title-chevron" size="1.25rem" />
        </Link>
      </div>
      <ScrollView
        orientation="horizontal"
        className="carousel-viewport"
        renderTrack={({ trackProps }) => (
          <div className={`carousel-row ${trackProps.className}`}>
            {cards.map((card) => (
              <MediaCardComponent
                key={mediaCardKey(card)}
                item={card}
                onClick={onResume}
                showContinueOverlay
              />
            ))}
          </div>
        )}
      />
    </section>
  );
};

export default ProfileContinueRail;
