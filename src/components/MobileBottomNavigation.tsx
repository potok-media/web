import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, Search, Play, User } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";

export const MobileBottomNavigation: React.FC = () => {
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();

  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!potokToken) {
      e.preventDefault();
      showHUD("warning", "Пожалуйста, войдите в аккаунт Potok для доступа к разделу");
      navigate("/profile");
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`} end>
        <Home size="1.25rem" />
        <span>Главная</span>
      </NavLink>

      <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}>
        <Search size="1.25rem" />
        <span>Поиск</span>
      </NavLink>

      <NavLink
        to="/calendar"
        className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
        onClick={handleProtectedClick}
      >
        <Calendar size="1.25rem" />
        <span>Расписание</span>
      </NavLink>

      <NavLink
        to="/library/up-next"
        className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
        onClick={handleProtectedClick}
      >
        <Play size="1.25rem" />
        <span>Медиатека</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}>
        <User size="1.25rem" />
        <span>Кабинет</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNavigation;

