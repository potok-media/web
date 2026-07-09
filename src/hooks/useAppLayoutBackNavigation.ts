import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlatformManager } from "../utils/PlatformManager";

export function useAppLayoutBackNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleBackPressed = (e: Event) => {
      if (e.defaultPrevented) return;

      const isHome = location.pathname === "/";
      if (isHome) {
        PlatformManager.exitApp();
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("potok-back-pressed", handleBackPressed);
    return () => {
      window.removeEventListener("potok-back-pressed", handleBackPressed);
    };
  }, [location.pathname, navigate]);
}