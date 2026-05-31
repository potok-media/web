import React, { useState } from "react";
import { Clock } from "lucide-react";
import "../styles/media.css";

interface CalendarEpisode {
  id: string;
  showTitle: string;
  episodeTitle: string;
  episodeNumber: string;
  airTime: string;
  posterSrc?: string;
  overview?: string;
}

export const CalendarPage: React.FC = () => {
  const days = [
    { key: "today", label: "Сегодня" },
    { key: "tomorrow", label: "Завтра" },
    { key: "this-week", label: "На этой неделе" }
  ];
  const [activeDay, setActiveDay] = useState("today");

  // Mock scheduled data mirroring Trakt schedule list
  const scheduleData: Record<string, CalendarEpisode[]> = {
    today: [
      {
        id: "1",
        showTitle: "Атака титанов",
        episodeTitle: "Финал: Часть 3",
        episodeNumber: "Сезон 4, Эпизод 29",
        airTime: "18:00 (МСК)",
        posterSrc: "https://image.tmdb.org/t/p/w500/hE5Yv5nsEcrDghjB1hU3X5w1tBs.jpg",
        overview: "Решающая битва человечества против титанов достигает своего апогея."
      },
      {
        id: "2",
        showTitle: "Клинок, рассекающий демонов",
        episodeTitle: "Тренировка столпов",
        episodeNumber: "Сезон 4, Эпизод 3",
        airTime: "21:30 (МСК)",
        posterSrc: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9U0s3CWe7Pj246BhCc0.jpg",
        overview: "Танджиро отправляется к Столпу Камня для изнурительной подготовки."
      }
    ],
    tomorrow: [
      {
        id: "3",
        showTitle: "Пацаны",
        episodeTitle: "Департамент грязных дел",
        episodeNumber: "Сезон 4, Эпизод 1",
        airTime: "09:00 (МСК)",
        posterSrc: "https://image.tmdb.org/t/p/w500/7irp2Bt7FU97n568oV24TTr5LIe.jpg",
        overview: "Мир на грани краха. Виктория Ньюман близка к Овальному кабинету как никогда."
      }
    ],
    "this-week": [
      {
        id: "4",
        showTitle: "Дом Дракона",
        episodeTitle: "Сын за сына",
        episodeNumber: "Сезон 2, Эпизод 1",
        airTime: "Понедельник, 04:00",
        posterSrc: "https://image.tmdb.org/t/p/w500/1XS1nmg9J2114VvQQUsj567tOZI.jpg",
        overview: "Вестерос стоит на пороге кровавой гражданской войны между Зелеными и Черными."
      }
    ]
  };

  const episodes = scheduleData[activeDay] || [];

  return (
    <div className="calendar-container">
      <header className="calendar-header">
        <h1 className="calendar-title">Календарь релизов</h1>
        <p className="calendar-description">
          Расписание выхода новых серий ваших сериалов на основе данных Trakt.tv.
        </p>
      </header>

      {/* Days Tabs selector */}
      <div className="tabs-header calendar-tabs">
        {days.map((d) => (
          <button
            key={d.key}
            className={`tab-btn ${activeDay === d.key ? "active" : ""}`}
            onClick={() => setActiveDay(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="calendar-list">
        {episodes.map((ep) => (
          <div key={ep.id} className="stream-row calendar-row">
            {/* Poster image preview */}
            <div className="calendar-poster-wrap">
              <img
                src={ep.posterSrc}
                alt={ep.showTitle}
                className="calendar-poster-img"
              />
            </div>

            {/* Episode detail info */}
            <div className="calendar-info-col">
              <span className="calendar-show-title">{ep.showTitle}</span>
              <span className="calendar-episode-title">
                {ep.episodeNumber}: "{ep.episodeTitle}"
              </span>
              {ep.overview && (
                <p className="calendar-episode-overview">
                  {ep.overview}
                </p>
              )}
            </div>

            {/* Time release tag */}
            <div className="calendar-time-tag">
              <Clock size={14} className="calendar-time-icon" />
              <span>{ep.airTime}</span>
            </div>
          </div>
        ))}

        {episodes.length === 0 && (
          <div className="calendar-empty">
            Нет запланированных релизов на этот период.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
