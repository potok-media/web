import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/useHUD";
import { IconButton, PopoverItem, cx } from "./ui";

/**
 * Top-right profile icon as a menu trigger (same popover idiom as AppMenuPopover):
 * «Профиль» navigates to /profile, «Выйти» logs out. Escape closes and returns focus
 * to the trigger.
 */
export const UserMenuPopover: React.FC = React.memo(() => {
  const { t } = useTranslation("sidebar");
  const { t: tProfile } = useTranslation("profile");
  const { logout } = useAuth();
  const { show: showHUD } = useHUD();
  const location = useLocation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    showHUD("info", tProfile("hud.loggedOut"));
  };

  return (
    <div ref={rootRef} className="app-topbar-menu">
      <IconButton
        ref={triggerRef}
        type="button"
        className={cx("app-topbar__profile", isOpen && "is-active")}
        title={t("profile")}
        aria-label={t("profile")}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserRound size="1.125rem" aria-hidden="true" />
      </IconButton>

      {isOpen ? (
        <div id={menuId} className="app-topbar-menu__popover app-topbar-menu__popover--end" role="menu">
          <nav className="app-topbar-menu__nav" aria-label={t("profile")}>
            <section className="app-topbar-menu__section">
              <NavLink
                to="/profile"
                onClick={closeMenu}
                className="app-topbar-menu__link"
              >
                <UserRound size="1.125rem" aria-hidden="true" />
                <span>{t("profile")}</span>
              </NavLink>
              <PopoverItem className="app-topbar-menu__link" onClick={handleLogout}>
                <LogOut size="1.125rem" aria-hidden="true" />
                <span>{t("logout")}</span>
              </PopoverItem>
            </section>
          </nav>
        </div>
      ) : null}
    </div>
  );
});

UserMenuPopover.displayName = "UserMenuPopover";

export default UserMenuPopover;
