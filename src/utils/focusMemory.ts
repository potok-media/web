import { getCurrentFocusKey, setFocus } from "@noriginmedia/norigin-spatial-navigation";

/**
 * Remembers which element was focused on each route so focus can be restored when the user
 * navigates BACK (react-router unmounts pages, so norigin's own focus state is destroyed).
 * Mirrors AppLayout's scroll-position restoration, keyed by the router's stable `location.key`.
 *
 * Flow:
 *  - AppLayout calls setActiveRoute(location.key) so we know which route focus belongs to.
 *  - The Focusable wrappers (TVNavigation) call rememberFocus() on every focus change, recording
 *    the focused key under the active route.
 *  - A page's initial-focus effect calls restoreFocusOrDefault(location.key, defaultKey): it tries
 *    the remembered key and only falls back to the page default if that element isn't mounted.
 *
 * For restoration to hit a specific card, cards need STABLE focusKeys (see MediaRow / LibraryPage).
 */

let activeRouteKey = "";
const memory = new Map<string, string>();

export function setActiveRoute(routeKey: string | undefined): void {
  activeRouteKey = routeKey || "";
}

/** The remembered focus key for a route (undefined on a first/forward visit). */
export function recallFocus(routeKey: string | undefined): string | undefined {
  return routeKey ? memory.get(routeKey) : undefined;
}

/** Record the currently-focused key for the active route (called as focus moves). */
export function rememberFocus(focusKey?: string | null): void {
  const key = focusKey || getCurrentFocusKey();
  if (activeRouteKey && key) memory.set(activeRouteKey, key);
}

/**
 * Restore focus for a route: try the remembered key; if it isn't currently mounted (setFocus
 * didn't take), fall back to the page's default. Returns true if the remembered key was restored.
 */
export function restoreFocusOrDefault(routeKey: string | undefined, defaultFocusKey?: string): boolean {
  const saved = routeKey ? memory.get(routeKey) : undefined;
  if (saved) {
    setFocus(saved);
    if (getCurrentFocusKey() === saved) return true;
  }
  if (defaultFocusKey) setFocus(defaultFocusKey);
  return false;
}
