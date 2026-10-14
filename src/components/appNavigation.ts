import {
  Bookmark,
  Calendar,
  Clock,
  Home,
  Play,
  Settings,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";

export type AppNavigationGroup = "home" | "library" | "account";

export interface AppNavigationItem {
  id: string;
  to: string;
  labelKey: string;
  icon: LucideIcon;
  group: AppNavigationGroup;
  end: boolean;
  requiresAuth: boolean;
  showInTopbar: boolean;
}

export const APP_NAVIGATION_ITEMS = [
  {
    id: "home",
    to: "/",
    labelKey: "home",
    icon: Home,
    group: "home",
    end: true,
    requiresAuth: false,
    showInTopbar: true,
  },
  {
    id: "up-next",
    to: "/library/up-next",
    labelKey: "upNext",
    icon: Play,
    group: "library",
    end: true,
    requiresAuth: true,
    showInTopbar: true,
  },
  {
    id: "calendar",
    to: "/calendar",
    labelKey: "calendar",
    icon: Calendar,
    group: "library",
    end: true,
    requiresAuth: true,
    showInTopbar: false,
  },
  {
    id: "watchlist",
    to: "/library/watchlist",
    labelKey: "watchlist",
    icon: Bookmark,
    group: "library",
    end: true,
    requiresAuth: true,
    showInTopbar: true,
  },
  {
    id: "favorites",
    to: "/library/favorites",
    labelKey: "favorites",
    icon: Star,
    group: "library",
    end: true,
    requiresAuth: true,
    showInTopbar: true,
  },
  {
    id: "history",
    to: "/library/history",
    labelKey: "history",
    icon: Clock,
    group: "library",
    end: true,
    requiresAuth: true,
    showInTopbar: false,
  },
  {
    id: "profile",
    to: "/profile",
    labelKey: "profile",
    icon: User,
    group: "account",
    end: true,
    requiresAuth: false,
    showInTopbar: false,
  },
  {
    id: "settings",
    to: "/settings",
    labelKey: "settings",
    icon: Settings,
    group: "account",
    end: true,
    requiresAuth: false,
    showInTopbar: false,
  },
] as const satisfies readonly AppNavigationItem[];

export const TOPBAR_NAVIGATION_ITEMS = APP_NAVIGATION_ITEMS.filter(
  (item) => item.showInTopbar,
);

export const HOME_NAVIGATION_ITEMS = APP_NAVIGATION_ITEMS.filter(
  (item) => item.group === "home",
);

export const LIBRARY_NAVIGATION_ITEMS = APP_NAVIGATION_ITEMS.filter(
  (item) => item.group === "library",
);

export const ACCOUNT_NAVIGATION_ITEMS = APP_NAVIGATION_ITEMS.filter(
  (item) => item.group === "account",
);
