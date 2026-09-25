import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FilmOff } from "../FilmOff";
import { Button, Input, Pressable, Select } from "../../ui";
import { EpisodeAnnotationBadge } from "../EpisodeAnnotationBadge";
import { finalizeGroupTitle } from "../../seasonGroupLabels";
import { ApiClient } from "../../../network/ApiClient";
import { formatLocalizedDate } from "../../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../../utils/language";
import type { SDKArmBindingTarget } from "../../../sdk/src/types";
import type { EpisodeSelectorPopupProps, FileOverrideMode } from "./types";
import { toArmOverrideGroups } from "./armOverrideModel";
import { resolveEpisodeStillUrl } from "./artwork";

interface EpisodeOverridePickerProps {
  seasons: EpisodeSelectorPopupProps["seasons"];
  seasonsLoading: boolean;
  onApplyOverride: (seasonNum: number, epNum: number) => void;
  canonicalBindingEnabled?: boolean;
  armLayout?: EpisodeSelectorPopupProps["armLayout"];
  armLayoutLoading?: boolean;
  armLayoutError?: boolean;
  onRetryArmLayout?: () => void;
  onApplyEpisodeBinding?: (target: SDKArmBindingTarget) => void;
  overrideMode?: FileOverrideMode;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return formatLocalizedDate(dateStr, { day: "numeric", month: "long", year: "numeric" },
    toIntlLocale(getActiveLanguage())) || dateStr;
}

const ArmEpisodeOverridePicker: React.FC<Pick<EpisodeOverridePickerProps,
  "armLayout" | "onApplyEpisodeBinding" | "overrideMode"
>> = ({ armLayout, onApplyEpisodeBinding, overrideMode }) => {
  const { t } = useTranslation("media");
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => toArmOverrideGroups(armLayout)
    .map((group) => ({
      ...group,
      label: group.kind === "season" && group.displayNumber == null && !group.title
        ? t("selector.episodeGroup")
        : finalizeGroupTitle({ ...group, episodes: [] }, t),
    })), [armLayout, t]);
  const activeGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const search = query.trim().toLocaleLowerCase();
  const episodes = activeGroup?.episodes.filter((episode) => !search ||
    `${episode.ordinal} ${episode.title}`.toLocaleLowerCase().includes(search)) ?? [];

  if (!activeGroup) {
    return <div className="episode-picker-state" role="status">{t("override.armEmpty")}</div>;
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">{t(overrideMode === "pin" ? "override.pinPrompt" : "override.prompt")}</h4>
      <div className="episode-picker-controls">
        <label className="episode-picker-field">
          <span>{t("override.group")}</span>
          <Select
            value={activeGroup.id}
            options={groups.map((group) => ({ value: group.id, label: group.label }))}
            onChange={(id) => { setSelectedGroupId(id); setQuery(""); }}
            block
          />
        </label>
        <label className="episode-picker-field">
          <span>{t("override.search")}</span>
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="season-section">
        <h3 className="season-section-title">{activeGroup.label}</h3>
        {episodes.length === 0 ? (
          <div className="episode-picker-state" role="status">{t("override.noMatches")}</div>
        ) : (
          <div className="episode-grid">
            {episodes.map((episode) => {
              const title = episode.title || (episode.ordinal
                ? t("episode.fallbackName", { number: episode.ordinal }) : t("selector.unresolvedEpisode"));
              const still = resolveEpisodeStillUrl(episode.stillPath, ApiClient.baseURL);
              return (
                <Pressable
                  key={`${episode.target.groupId}:${episode.target.episodeId}`}
                  className="episode-picker-card episode-picker-card--canonical"
                  onPress={() => onApplyEpisodeBinding?.(episode.target)}
                  data-episode-id={episode.target.episodeId}
                >
                  <div className="episode-card-preview-wrap">
                    {still ? <img src={still} alt="" className="episode-card-image" loading="lazy" /> : (
                      <div className="episode-still-fallback-placeholder"><FilmOff size="1.75rem" /></div>
                    )}
                    {episode.ordinal && <span className="episode-card-badge">{episode.ordinal}</span>}
                    <EpisodeAnnotationBadge annotation={episode.annotation} overlay />
                  </div>
                  <div className="episode-card-info">
                    <span className="episode-card-title" title={title}>{title}</span>
                    {episode.airDate && <span className="episode-card-date">{formatDate(episode.airDate)}</span>}
                  </div>
                </Pressable>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const EpisodeOverridePicker: React.FC<EpisodeOverridePickerProps> = React.memo(({
  seasons = [],
  seasonsLoading,
  onApplyOverride,
  canonicalBindingEnabled = false,
  armLayout,
  armLayoutLoading = false,
  armLayoutError = false,
  onRetryArmLayout,
  onApplyEpisodeBinding,
  overrideMode,
}) => {
  const { t } = useTranslation("media");
  if (canonicalBindingEnabled ? armLayoutLoading : seasonsLoading) {
    return (
      <div className="picker-loading-container episode-picker-state" role="status">
        <div className="premium-spinner picker-spinner-margin" aria-hidden="true">
          <div className="spinner-outer" /><div className="spinner-inner" />
        </div>
        <span className="picker-loading-label">{t(canonicalBindingEnabled ? "override.armLoading" : "override.loading")}</span>
      </div>
    );
  }
  if (canonicalBindingEnabled) {
    if (armLayoutError) {
      return (
        <div className="episode-picker-state" role="alert">
          <p>{t("override.armError")}</p>
          {onRetryArmLayout && <Button variant="secondary" onClick={onRetryArmLayout}>{t("common:actions.retry")}</Button>}
        </div>
      );
    }
    return <ArmEpisodeOverridePicker armLayout={armLayout} onApplyEpisodeBinding={onApplyEpisodeBinding} overrideMode={overrideMode} />;
  }

  const availableSeasons = seasons.filter((season) => (season.episodes?.length ?? 0) > 0);
  if (!availableSeasons.length) {
    return <div className="episode-picker-state" role="status">{t("selector.noEpisodes")}</div>;
  }
  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">{t(overrideMode === "pin" ? "override.pinPrompt" : "override.prompt")}</h4>
      {availableSeasons.map((season) => {
        const seasonNum = season.seasonNumber ?? season.season_number;
        if (seasonNum === undefined) return null;
        return (
          <div key={season.id || seasonNum} className="season-section">
            <h3 className="season-section-title">
              {seasonNum === 0 ? t("selector.specials") : t("selector.season", { number: seasonNum })}
            </h3>
            <div className="episode-grid">
              {season.episodes?.map((episode) => {
                const epNum = episode.episodeNumber ?? episode.episode_number;
                if (epNum === undefined) return null;
                const epName = episode.name || t("episode.fallbackName", { number: epNum });
                const epStill = episode.stillPath || episode.still_path;
                const epAirDate = episode.airDate || episode.air_date;
                return (
                  <Pressable key={episode.id || epNum} className="episode-picker-card" onPress={() => onApplyOverride(seasonNum, epNum)}>
                    <div className="episode-card-preview-wrap">
                      {epStill ? <img src={epStill} alt="" className="episode-card-image" loading="lazy" /> : (
                        <div className="episode-still-fallback-placeholder"><FilmOff size="1.75rem" /></div>
                      )}
                      <span className="episode-card-badge">{epNum}</span>
                    </div>
                    <div className="episode-card-info">
                      <span className="episode-card-title">{epName}</span>
                      {epAirDate && <span className="episode-card-date">{formatDate(epAirDate)}</span>}
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
