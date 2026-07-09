import React from "react";
import { useTranslation } from "react-i18next";
import { Chip } from "../../components/ui";
import type { CalendarFilterKey } from "./useCalendarFilters";

interface CalendarHeaderProps {
  isTraktConnected: boolean;
  activeFilter: CalendarFilterKey;
  onFilterChange: (filter: CalendarFilterKey) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  isTraktConnected,
  activeFilter,
  onFilterChange,
}) => {
  const { t } = useTranslation("media");

  const filterChips = [
    { key: "all", label: t("calendar.filters.all") },
    { key: "today", label: t("calendar.filters.today") },
    { key: "tomorrow", label: t("calendar.filters.tomorrow") },
    { key: "this-week", label: t("calendar.filters.thisWeek") },
  ] as const;

  return (
    <>
      <header className="calendar-header">
        <h1 className="calendar-title">{t("calendar.title")}</h1>
        <p className="calendar-description">
          {isTraktConnected ? t("calendar.descriptionConnected") : t("calendar.descriptionGuest")}
        </p>
      </header>

      <nav className="tabs-header calendar-tabs" aria-label={t("calendar.filtersAriaLabel")}>
        {filterChips.map((chip) => (
          <Chip
            key={chip.key}
            active={activeFilter === chip.key}
            className="tab-btn"
            onClick={() => onFilterChange(chip.key)}
            aria-current={activeFilter === chip.key ? "page" : undefined}
          >
            {chip.label}
          </Chip>
        ))}
      </nav>
    </>
  );
};