/**
 * focusMemory.ts stub for web version.
 */

export function setActiveRoute(_routeKey: string | undefined): void {}

export function recallFocus(_routeKey: string | undefined): string | undefined {
  return undefined;
}

export function rememberFocus(_focusKey?: string | null): void {}

export function restoreFocusOrDefault(_routeKey: string | undefined, _defaultFocusKey?: string): boolean {
  return false;
}
