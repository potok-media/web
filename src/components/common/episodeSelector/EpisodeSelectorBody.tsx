import React from "react";
import { useTranslation } from "react-i18next";
import { Pencil, RotateCcw } from "lucide-react";
import { EpisodeSelectorRow } from "./EpisodeSelectorRow";
import { IconButton } from "../../ui";
import type { EpisodeSourceSection } from "./types";

interface EpisodeSelectorBodyProps {
  mediaType: string;
  totalCount: number;
  sourceSections: EpisodeSourceSection[];
  seasonMap: Record<string, { season: number; offset: number }>;
  firstEpId?: string;
  backdropSrc?: string;
  posterSrc?: string;
  onPlay: (episode: EpisodeSourceSection["episodes"][number]) => void;
  onEditSection: (section: { rawSeason: number | undefined; rawFirstEp: number }) => void;
  onResetOverride?: (sourceSeason: number | null) => void;
}

export const EpisodeSelectorBody: React.FC<EpisodeSelectorBodyProps> = ({
  mediaType,
  totalCount,
  sourceSections,
  seasonMap,
  backdropSrc,
  posterSrc,
  onPlay,
  onEditSection,
  onResetOverride,
}) => {
  const { t } = useTranslation("media");

  return (
    <div className="files-list-container episode-files-list">
      <div className="episode-popup-rows-list episode-popup-rows-scroll">
        {totalCount > 0 ? (
          sourceSections.map((section) => {
            const mapEntry = seasonMap[section.key];
            const srcRaw = section.rawSeason;
            return (
              <div key={section.key} className="episode-season-group">
                {mediaType === "tv" && (
                  <div className="season-section-header">
                    <h3 className="season-section-title">
                      {section.displayedSeason === 0
                        ? t("selector.specials")
                        : t("selector.season", { number: section.displayedSeason })}
                    </h3>
                    {mapEntry && (
                      <span className="season-map-badge">
                        {srcRaw !== undefined && srcRaw !== section.displayedSeason
                          ? `S${srcRaw}→ `
                          : ""}
                        {mapEntry.offset >= 0 ? "+" : ""}
                        {mapEntry.offset}
                      </span>
                    )}
                    <IconButton
                      className="season-edit-pencil"
                      onClick={() => onEditSection(section)}
                      aria-label={t("selector.editSeasonMapping")}
                    >
                      <Pencil size="0.9375rem" />
                    </IconButton>
                    {mapEntry && onResetOverride && (
                      <IconButton
                        className="season-edit-pencil"
                        onClick={() => onResetOverride(srcRaw ?? null)}
                        aria-label={t("selector.resetSeasonMapping")}
                      >
                        <RotateCcw size="0.9375rem" />
                      </IconButton>
                    )}
                  </div>
                )}
                {section.episodes.map((ep) => (
                  <EpisodeSelectorRow
                    key={ep.id}
                    episodeItem={ep}
                    mediaType={mediaType}
                    backdropSrc={backdropSrc}
                    posterSrc={posterSrc}
                    onPlay={() => onPlay(ep)}
                  />
                ))}
              </div>
            );
          })
        ) : (
          <div className="episode-popup-empty-files">{t("selector.noEpisodes")}</div>
        )}
      </div>
    </div>
  );
};