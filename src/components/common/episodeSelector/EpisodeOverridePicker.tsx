import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Tv } from "lucide-react";
import { FilmOff } from "../FilmOff";
import { Button, PopoverItem, Pressable } from "../../ui";
import { EpisodeAnnotationBadge } from "../EpisodeAnnotationBadge";
import { ApiClient } from "../../../network/ApiClient";
import { fetchTmdbSeasonMeta, type TmdbSeasonMeta } from "../../../features/arm/tmdbSeasonMeta";
import { formatLocalizedDate } from "../../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../../utils/language";
import type { SDKArmBindingTarget } from "../../../sdk/src/types";
import type { EpisodeSelectorPopupProps, FileOverrideMode } from "./types";
import { toArmOverrideGroups, type ArmOverrideGroup } from "./armOverrideModel";
import { finalizeGroupTitle, isGenericSeasonTitle } from "../../seasonGroupLabels";
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

/**
 * Localized season overlays for every bridged group (labels for the dropdown) plus the active
 * one (episode names/stills/dates). Progressive: groups first render with their
 * structure-source title and swap to the TMDB-localized label as payloads land — the fetch
 * helper dedups and caches per (show, season), failures stay cosmetic.
 */
function useSeasonOverlays(groups: ArmOverrideGroup[]): Map<string, TmdbSeasonMeta> {
  const [overlays, setOverlays] = useState<Map<string, TmdbSeasonMeta>>(new Map());
  const key = groups.map(group => `${group.id}:${group.tmdbShow ?? ""}:${group.tmdbSeason ?? ""}`).join("|");

  useEffect(() => {
    const wanted = groups.filter(group => group.tmdbShow != null && group.tmdbSeason != null);
    if (wanted.length === 0) {
      setOverlays(new Map());
      return;
    }
    let cancelled = false;
    for (const group of wanted) {
      fetchTmdbSeasonMeta(group.tmdbShow!, group.tmdbSeason!).then(meta => {
        if (cancelled || !meta) return;
        setOverlays(previous => new Map(previous).set(group.id, meta));
      });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return overlays;
}

const ArmEpisodeOverridePicker: React.FC<Pick<EpisodeOverridePickerProps,
  "armLayout" | "onApplyEpisodeBinding" | "overrideMode"
>> = ({ armLayout, onApplyEpisodeBinding, overrideMode }) => {
  const { t } = useTranslation("media");
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [showGroupPopover, setShowGroupPopover] = useState(false);
  const groups = useMemo(() => toArmOverrideGroups(armLayout), [armLayout]);
  const overlays = useSeasonOverlays(groups);
  const labelled = groups.map(group => {
    const localizedTitle = overlays.get(group.id)?.seasonName || null;
    // A generic localized season name ("Сезон 1") carries no information — and several graph
    // entries may live in the same TMDB season (split cours), colliding on it. In that case
    // the graph's own number + entry title disambiguates ("Сезон 2: MASHLE: Kami …").
    const displayTitle = localizedTitle && !isGenericSeasonTitle(localizedTitle)
      ? localizedTitle
      : group.title || localizedTitle;
    return {
      ...group,
      label: displayTitle
        ? group.kind === "season" && group.displayNumber != null
          ? t("seasons.seasonTitled", { number: group.displayNumber, title: displayTitle })
          : displayTitle
        : group.kind === "season" && group.displayNumber == null
          ? t("selector.episodeGroup")
          : finalizeGroupTitle({ ...group, episodes: [] }, t),
    };
  });
  const activeGroup = labelled.find((group) => group.id === selectedGroupId) ?? labelled[0];
  const activeMeta = activeGroup ? overlays.get(activeGroup.id) : undefined;

  if (!activeGroup) {
    return <div className="episode-picker-state" role="status">{t("override.armEmpty")}</div>;
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">{t(overrideMode === "pin" ? "override.pinPrompt" : "override.prompt")}</h4>
      <div className="episode-picker-controls">
        <div className="season-select-wrapper">
          <Button
            variant="glass"
            className="season-select-trigger-btn"
            onClick={() => setShowGroupPopover(open => !open)}
            aria-expanded={showGroupPopover}
          >
            <span>{activeGroup.label}</span>
            <ChevronDown size="0.875rem" />
          </Button>
          {showGroupPopover && (
            <>
              <div className="popover-overlay" onClick={() => setShowGroupPopover(false)} />
              <div className="season-popover-menu">
                {labelled.map((group) => (
                  <PopoverItem
                    key={group.id}
                    active={activeGroup.id === group.id}
                    className="season-popover-item"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setShowGroupPopover(false);
                    }}
                  >
                    <Tv size="1rem" className="season-item-icon" />
                    <span>{group.label}</span>
                    {activeGroup.id === group.id && <Check size="1rem" className="season-active-check" />}
                  </PopoverItem>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="season-section">
        <h3 className="season-section-title">{activeGroup.label}</h3>
        <div className="episode-grid">
          {activeGroup.episodes.map((episode) => {
            const meta = episode.tmdb?.episode != null ? activeMeta?.episodes.get(episode.tmdb.episode) : undefined;
            const title = meta?.name || (episode.ordinal
              ? t("episode.fallbackName", { number: episode.ordinal }) : t("selector.unresolvedEpisode"));
            const still = resolveEpisodeStillUrl(meta?.stillPath ?? null, ApiClient.baseURL);
            return (
              <Pressable
                key={`${episode.target.entryId}:${episode.target.episodeId}`}
                className="episode-picker-card episode-picker-card--canonical"
                onPress={() => onApplyEpisodeBinding?.(episode.target)}
                data-episode-id={episode.target.episodeId}
              >
                <div className="episode-card-preview-wrap">
                  {still ? <img src={still} alt="" className="episode-card-image" loading="lazy" /> : (
                    <div className="episode-still-fallback-placeholder"><FilmOff size="1.75rem" /></div>
                  )}
                  {episode.ordinal && <span className="episode-card-badge">{episode.ordinal}</span>}
                  <EpisodeAnnotationBadge filler={episode.filler} overlay />
                </div>
                <div className="episode-card-info">
                  <span className="episode-card-title" title={title}>{title}</span>
                  {meta?.airDate && <span className="episode-card-date">{formatDate(meta.airDate)}</span>}
                </div>
              </Pressable>
            );
          })}
        </div>
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
