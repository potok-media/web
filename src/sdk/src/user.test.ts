import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserSnapshot, onUserChange, setUserSnapshot, user } from "./user";

beforeEach(() => {
  setUserSnapshot({ isAuth: false, id: null, username: null });
});

describe("PotokSDK.user store", () => {
  it("exposes dry guest identity by default", () => {
    expect(user.isAuth()).toBe(false);
    expect(user.id()).toBeNull();
    expect(user.username()).toBeNull();
  });

  it("onChange fires on login and logout", () => {
    const seen: string[] = [];
    const off = user.onChange((snapshot) => {
      seen.push(`${snapshot.isAuth}:${snapshot.username}`);
    });

    // Identical re-publish (AuthContext re-render) must not fire.
    setUserSnapshot({ isAuth: false, id: null, username: null });
    expect(seen).toEqual([]);

    setUserSnapshot({ isAuth: true, id: "user-1", username: "neo" });
    expect(user.isAuth()).toBe(true);
    expect(user.id()).toBe("user-1");
    expect(user.username()).toBe("neo");
    expect(seen).toEqual(["true:neo"]);

    setUserSnapshot({ isAuth: false, id: null, username: null });
    expect(seen).toEqual(["true:neo", "false:null"]);
    expect(getUserSnapshot().isAuth).toBe(false);

    off();
    setUserSnapshot({ isAuth: true, id: "user-2", username: "trinity" });
    expect(seen).toEqual(["true:neo", "false:null"]);
  });

  it("survives a throwing listener and still notifies the rest", () => {
    const good = vi.fn();
    onUserChange(() => {
      throw new Error("boom");
    });
    onUserChange(good);
    setUserSnapshot({ isAuth: true, id: "user-1", username: "neo" });
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed payloads to a safe guest snapshot", () => {
    setUserSnapshot(undefined);
    expect(getUserSnapshot()).toEqual({ isAuth: false, id: null, username: null });
    setUserSnapshot({ isAuth: true, id: undefined as unknown as string, username: undefined as unknown as string });
    expect(user.isAuth()).toBe(true);
    expect(user.id()).toBeNull();
    expect(user.username()).toBeNull();
  });
});
