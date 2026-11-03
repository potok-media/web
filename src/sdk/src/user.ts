import type { SDKUserSnapshot } from "./types";

/**
 * Module-level user store backing PotokSDK.user. One instance per window: the host app feeds it
 * from AuthContext effects, plugin sandboxes get the initial snapshot through
 * window.PotokInitialState.user and subsequent transitions via the host's USER_STATE_CHANGED
 * postMessage (handled in index.ts). No tokens ever pass through here.
 */

const GUEST_SNAPSHOT: SDKUserSnapshot = { isAuth: false, id: null, username: null };

let snapshot: SDKUserSnapshot = GUEST_SNAPSHOT;
const listeners = new Set<(user: SDKUserSnapshot) => void>();

function normalizeUser(raw: SDKUserSnapshot | null | undefined): SDKUserSnapshot {
  if (!raw || typeof raw !== "object") return GUEST_SNAPSHOT;
  return {
    isAuth: !!raw.isAuth,
    id: typeof raw.id === "string" ? raw.id : null,
    username: typeof raw.username === "string" ? raw.username : null,
  };
}

function sameUser(a: SDKUserSnapshot, b: SDKUserSnapshot): boolean {
  return a.isAuth === b.isAuth && a.id === b.id && a.username === b.username;
}

export function getUserSnapshot(): SDKUserSnapshot {
  return snapshot;
}

/** Pushes a new snapshot; no-op (no event) when the dry identity is unchanged. */
export function setUserSnapshot(next: SDKUserSnapshot | null | undefined): void {
  const normalized = normalizeUser(next);
  if (sameUser(normalized, snapshot)) return;
  snapshot = normalized;
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (err) {
      console.error("[SDK] Error in user.onChange listener:", err);
    }
  });
}

export function onUserChange(cb: (user: SDKUserSnapshot) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const user = {
  isAuth: (): boolean => snapshot.isAuth,
  id: (): string | null => snapshot.id,
  username: (): string | null => snapshot.username,
  onChange: (cb: (user: SDKUserSnapshot) => void): (() => void) => onUserChange(cb),
};
