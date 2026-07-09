import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCalendarData } from "../hooks/useCalendarData";

import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarBody } from "./calendar/CalendarBody";
import { useCalendarFilters, type CalendarFilterKey } from "./calendar/useCalendarFilters";

export const CalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation("media");
  const { items, loading, error, refetch, isTraktConnected } = useCalendarData();
  const [activeFilter, setActiveFilter] = useState<CalendarFilterKey>("all");

  const { groupedGroups, formatReleaseTime } = useCalendarFilters(
    items,
    activeFilter,
    t,
    i18n.language,
  );

  return (
    <main className="calendar-container">
      <CalendarHeader
        isTraktConnected={isTraktConnected}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <CalendarBody
        isTraktConnected={isTraktConnected}
        loading={loading}
        error={error}
        groupedGroups={groupedGroups}
        formatReleaseTime={formatReleaseTime}
        onRefetch={refetch}
      />
    </main>
  );
};

export default CalendarPage;