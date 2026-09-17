import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, X } from "lucide-react";
import { Button } from "../ui";
import {
  TORRENT_SEARCH_HTTP_TIMEOUT_MS,
  formatSearchCountdown,
} from "../../utils/extensions/pluginHttpTimeout";

interface StreamFilterRefreshButtonProps {
  onRefresh: () => void;
  isSearching?: boolean;
  searchStartedAt?: number | null;
  searchTimeoutMs?: number;
}

export const StreamFilterRefreshButton: React.FC<StreamFilterRefreshButtonProps> = ({
  onRefresh,
  isSearching = false,
  searchStartedAt = null,
  searchTimeoutMs = TORRENT_SEARCH_HTTP_TIMEOUT_MS,
}) => {
  const { t } = useTranslation("streams");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isSearching || searchStartedAt == null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [isSearching, searchStartedAt]);

  const remainingSeconds =
    isSearching && searchStartedAt != null
      ? Math.max(0, Math.ceil((searchStartedAt + searchTimeoutMs - now) / 1000))
      : 0;
  const timeLabel = formatSearchCountdown(remainingSeconds);
  const label = isSearching
    ? t("actions.cancelSearchWithTime", { time: timeLabel })
    : t("actions.refresh");

  return (
    <Button
      variant="glass"
      className="filter-btn-trigger"
      onClick={onRefresh}
      aria-label={label}
    >
      {isSearching ? <X size="0.875rem" /> : <RotateCw size="0.875rem" />}
      <span className="filter-btn-text filter-btn-text--countdown">{label}</span>
    </Button>
  );
};
