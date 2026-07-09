import React from "react";
import { useTranslation } from "react-i18next";
import { FilmOff } from "../FilmOff";
import { Pressable } from "../../ui";

import { formatLocalizedDate } from "../../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../../utils/language";
import type { EpisodeSelectorPopupProps } from "./types";

interface EpisodeOverridePickerProps {
  seasons: EpisodeSelectorPopupProps["seasons"];
  seasonsLoading: boolean;
  onApplyOverride: (seasonNum: number, epNum: number) => void;
}

export const EpisodeOverridePicker: React.FC<EpisodeOverridePickerProps> = React.memo(({
  seasons = [],
  seasonsLoading,
  onApplyOverride,
}) => {
  const { t } = useTranslation("media");

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const formatted = formatLocalizedDate(
      dateStr,
      { day: "numeric", month: "long", year: "numeric" },
      toIntlLocale(getActiveLanguage()),
    );
    return formatted || dateStr;
  };

  if (seasonsLoading) {
    return (
      <div className="picker-loading-container">
        <div className="premium-spinner picker-spinner-margin">
          <div className="spinner-outer" />
          <div className="spinner-inner" />
        </div>
        <span className="picker-loading-label">{t("override.loading")}</span>
      </div>
    );
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">{t("override.prompt")}</h4>
      {seasons.map((season) => {
        const seasonNum = season.seasonNumber ?? season.season_number ?? 1;
        const episodes = season.episodes ?? [];
        if (!episodes.length) return null;

        return (
          <div key={season.id || seasonNum} className="season-section">
            <h3 className="season-section-title">{t("selector.season", { number: seasonNum })}</h3>
            <div className="episode-grid">
              {episodes.map((episode) => {
                const epNum = episode.episodeNumber ?? episode.episode_number ?? 1;
                const epName = episode.name || t("episode.fallbackName", { number: epNum });
                const epStill = episode.stillPath || episode.still_path;
                const epAirDate = episode.airDate || episode.air_date;

                return (
                  <Pressable
                    key={episode.id || epNum}
                    className="episode-picker-card"
                    onPress={() => onApplyOverride(seasonNum, epNum)}
                    role="button"
                  >
                    <div className="episode-card-preview-wrap">
                      {epStill ? (
                        <img src={epStill} alt={epName} className="episode-card-image" loading="lazy" />
                      ) : (
                        <div className="episode-still-fallback-placeholder">
                          <FilmOff size="1.75rem" />
                        </div>
                      )}
                      <span className="episode-card-badge">{epNum}</span>
                    </div>
                    <div className="episode-card-info">
                      <span className="episode-card-title">{epName}</span>
                      {epAirDate && (
                        <span className="episode-card-date">{formatDate(epAirDate)}</span>
                      )}
                    </div>
                  </Pressable>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});