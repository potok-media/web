import React from "react";

export const CalendarSkeleton: React.FC = () => (
  <div className="calendar-list" aria-hidden="true">
    {[1, 2, 3].map((i) => (
      <div key={i} className="calendar-skeleton-row">
        <div className="calendar-skeleton-poster skeleton-pulse" />
        <div className="calendar-skeleton-info">
          <div className="calendar-skeleton-title skeleton-pulse" />
          <div className="calendar-skeleton-sub skeleton-pulse" />
          <div className="calendar-skeleton-desc skeleton-pulse" />
        </div>
        <div className="calendar-skeleton-time skeleton-pulse" />
      </div>
    ))}
  </div>
);