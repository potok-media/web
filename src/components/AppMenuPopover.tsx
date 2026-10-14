import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { List } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { Slot } from "./common/extension/Slot";
import { IconButton, cx } from "./ui";
import {
  ACCOUNT_NAVIGATION_ITEMS,
  HOME_NAVIGATION_ITEMS,
  LIBRARY_NAVIGATION_ITEMS,
  type AppNavigationItem,
} from "./appNavigation";

const EXPANDED_SLOT_PROPS = { isCollapsed: false } as const;

interface AppMenuLinkProps {
  item: AppNavigationItem;
  label: string;
  onNavigate: () => void;
}

const AppMenuLink: React.FC<AppMenuLinkProps> = React.memo(({ item, label, onNavigate }) => {
  const ItemIcon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => cx(
        "app-topbar-menu__link",
        isActive && "is-active",
        item.id === "settings" && "potok-safeguard",
      )}
    >
      <ItemIcon size="1.125rem" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
});

AppMenuLink.displayName = "AppMenuLink";

export const AppMenuPopover: React.FC = React.memo(() => {
  const { potokToken } = useAuth();
  const { t } = useTranslation("sidebar");
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

  return (
    <div ref={rootRef} className="app-topbar-menu">
      <IconButton
        ref={triggerRef}
        type="button"
        className="app-topbar-menu__trigger"
        title={t(isOpen ? "collapseMenu" : "expandMenu")}
        aria-label={t(isOpen ? "collapseMenu" : "expandMenu")}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <List size="1.125rem" aria-hidden="true" />
      </IconButton>

      {isOpen ? (
        <div id={menuId} className="app-topbar-menu__popover">
          <nav className="app-topbar-menu__nav" aria-label={t("expandMenu")}>
            <section className="app-topbar-menu__section">
              {HOME_NAVIGATION_ITEMS.map((item) => (
                <AppMenuLink
                  key={item.id}
                  item={item}
                  label={t(item.labelKey)}
                  onNavigate={closeMenu}
                />
              ))}
              <Slot
                name="sidebar-menu-home"
                props={EXPANDED_SLOT_PROPS}
                className="app-topbar-menu__slot"
              />
            </section>

            <section className="app-topbar-menu__section">
              {potokToken ? (
                <>
                  <div className="app-topbar-menu__section-title">{t("library")}</div>
                  {LIBRARY_NAVIGATION_ITEMS.map((item) => (
                    <AppMenuLink
                      key={item.id}
                      item={item}
                      label={t(item.labelKey)}
                      onNavigate={closeMenu}
                    />
                  ))}
                </>
              ) : null}
              <Slot
                name="sidebar-menu-library"
                props={EXPANDED_SLOT_PROPS}
                className="app-topbar-menu__slot"
              />
            </section>

            <Slot
              name="sidebar-groups"
              props={EXPANDED_SLOT_PROPS}
              className="app-topbar-menu__groups"
            />

            <section className="app-topbar-menu__section">
              {ACCOUNT_NAVIGATION_ITEMS.map((item) => (
                <AppMenuLink
                  key={item.id}
                  item={item}
                  label={t(item.labelKey)}
                  onNavigate={closeMenu}
                />
              ))}
              <Slot
                name="sidebar-menu"
                props={EXPANDED_SLOT_PROPS}
                className="app-topbar-menu__slot"
              />
            </section>
          </nav>
        </div>
      ) : null}
    </div>
  );
});

AppMenuPopover.displayName = "AppMenuPopover";

export default AppMenuPopover;
