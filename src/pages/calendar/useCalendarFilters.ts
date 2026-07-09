import { useMemo } from "react";
import type { TFunction } from "i18next";
import type { MediaCard } from "../../network/ApiTypes";
import { formatLocalizedDate } from "../../utils/formatDate";
import { toIntlLocale } from "../../utils/language";

export type CalendarFilterKey = "all" | "today" | "tomorrow" | "this-week";

export function useCalendarFilters(
  items: MediaCard[],
  activeFilter: CalendarFilterKey,
  t: TFunction,
  language: string,
) {
  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return items.filter((item) => {
      if (!item.airDateTime) {
        return activeFilter === "all";
      }
      const airDate = new Date(item.airDateTime);
      airDate.setHours(0, 0, 0, 0);

      if (activeFilter === "today") {
        return airDate.getTime() === today.getTime();
      }
      if (activeFilter === "tomorrow") {
        return airDate.getTime() === tomorrow.getTime();
      }
      if (activeFilter === "this-week") {
        return airDate.getTime() >= today.getTime() && airDate.getTime() <= endOfWeek.getTime();
      }
      return true;
    });
  }, [items, activeFilter]);

  const groupedGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups: Record<string, MediaCard[]> = {};

    filteredItems.forEach((item) => {
      let groupTitle = t("calendar.groups.tbd");
      if (item.airDateTime) {
        const date = new Date(item.airDateTime);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
          groupTitle = t("calendar.groups.today");
        } else if (date.getTime() === tomorrow.getTime()) {
          groupTitle = t("calendar.groups.tomorrow");
        } else {
          groupTitle = formatLocalizedDate(date, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }, toIntlLocale(language));
          groupTitle = groupTitle.charAt(0).toUpperCase() + groupTitle.slice(1);
        }
      }

      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(item);
    });

    return Object.entries(groups).map(([title, groupItems]) => ({
      title,
      items: groupItems,
    }));
  }, [filteredItems]);

  const formatReleaseTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return t("calendar.soon");
    try {
      const date = new Date(dateTimeStr);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return t("calendar.soon");
    }
  };

  return { filteredItems, groupedGroups, formatReleaseTime };
}