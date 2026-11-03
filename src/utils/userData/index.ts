import { getUserSnapshot } from "../../sdk/src/user";
import { GuestUserData } from "./guestUserData";
import { ServerUserData } from "./serverUserData";
import type { UserDataService } from "./types";

export * from "./types";
export { GuestUserData, GUEST_FOLDERS_KEY, GUEST_STATUS_KEY } from "./guestUserData";
export { ServerUserData } from "./serverUserData";

const guestUserData = new GuestUserData();
const serverUserData = new ServerUserData();

/**
 * Resolves the active implementation from the current auth state on every call, so a
 * login/logout mid-session flips storage targets immediately. Singletons keep guest
 * localStorage records and server state across switches.
 */
export function getUserData(): UserDataService {
  return getUserSnapshot().isAuth ? serverUserData : guestUserData;
}
