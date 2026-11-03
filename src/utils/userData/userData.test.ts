import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserSnapshot, setUserSnapshot } from "../../sdk/src/user";
import { SyncApiClient } from "../../network/SyncApiClient";
import {
  GUEST_FOLDERS_KEY,
  GUEST_STATUS_KEY,
  GuestUserData,
} from "./guestUserData";
import { getUserData } from "./index";

const backingStore = new Map<string, string>();

function installLocalStorageShim() {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => (backingStore.has(key) ? backingStore.get(key)! : null),
    setItem: (key: string, value: string) => void backingStore.set(key, String(value)),
    removeItem: (key: string) => void backingStore.delete(key),
    clear: () => backingStore.clear(),
    get length() {
      return backingStore.size;
    },
    key: (index: number) => [...backingStore.keys()][index] ?? null,
  };
}

function storedJson<T>(key: string): T {
  const raw = backingStore.get(key);
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

beforeEach(() => {
  backingStore.clear();
  installLocalStorageShim();
  setUserSnapshot({ isAuth: false, id: null, username: null });
  vi.unstubAllGlobals();
});

describe("guest status round-trip", () => {
  it("set → get → list → clear", async () => {
    const guest = getUserData();
    expect(getUserSnapshot().isAuth).toBe(false);
    expect(guest).toBeInstanceOf(GuestUserData);

    await guest.setStatus({ tmdbId: "550", mediaType: "movie", status: "watching", label: "Fight Club" });
    await guest.setStatus({ tmdbId: "1396", mediaType: "tv", status: "planned", label: "Breaking Bad" });
    await guest.setStatus({
      tmdbId: "1396",
      mediaType: "tv",
      status: "watching",
      workId: "11111111-2222-3333-4444-555555555555",
      label: "Breaking Bad",
    });

    expect(await guest.getStatus("550", "movie")).toEqual({ status: "watching" });
    expect(await guest.getStatus("999", "movie")).toEqual({ status: null });

    const watching = await guest.listByStatus("watching");
    expect(watching.total).toBe(2);
    expect(watching.items.map((item) => item.tmdbId)).toContain("550");
    expect(watching.items.find((item) => item.tmdbId === "1396")?.workId).toBe("11111111-2222-3333-4444-555555555555");
    expect(watching.items.find((item) => item.tmdbId === "550")?.title).toBe("Fight Club");
    expect((await guest.listByStatus("planned")).total).toBe(0);

    await guest.clearStatus("550", "movie");
    expect(await guest.getStatus("550", "movie")).toEqual({ status: null });
    expect((await guest.listByStatus("watching")).total).toBe(1);

    const persisted = storedJson<Record<string, { status: string; updatedAt: string }>>(GUEST_STATUS_KEY);
    expect(persisted["tv:1396"].status).toBe("watching");
    expect(persisted["tv:1396"].updatedAt).toBeTruthy();
    expect(persisted["movie:550"]).toBeUndefined();
  });

  it("paginates by status", async () => {
    const guest = getUserData();
    for (let i = 0; i < 5; i++) {
      await guest.setStatus({ tmdbId: String(100 + i), mediaType: "movie", status: "completed" });
    }
    const page = await guest.listByStatus("completed", 2, 2);
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
    expect(page.page).toBe(2);
  });
});

describe("guest folders", () => {
  it("CRUD round-trip", async () => {
    const guest = getUserData();
    const folder = await guest.createFolder("Сериалы");
    expect(folder.name).toBe("Сериалы");
    expect(folder.itemCount).toBe(0);

    await guest.renameFolder(folder.id, "Любимые сериалы");
    expect((await guest.listFolders())[0].name).toBe("Любимые сериалы");

    await guest.deleteFolder(folder.id);
    expect(await guest.listFolders()).toEqual([]);
    await expect(guest.deleteFolder(folder.id)).rejects.toThrow("Folder not found");
  });

  it("supports multi-membership: one item in several folders", async () => {
    const guest = getUserData();
    const a = await guest.createFolder("A");
    const b = await guest.createFolder("B");

    await guest.addFolderItem(a.id, "1396", "tv", "Breaking Bad");
    await guest.addFolderItem(b.id, "1396", "tv", "Breaking Bad");
    await guest.addFolderItem(a.id, "550", "movie", "Fight Club");

    const list = await guest.listFolders();
    expect(list.find((folder) => folder.id === a.id)?.itemCount).toBe(2);
    expect(list.find((folder) => folder.id === b.id)?.itemCount).toBe(1);

    const pageA = await guest.getFolderItems(a.id);
    expect(pageA.folder.id).toBe(a.id);
    expect(pageA.items.map((item) => item.tmdbId).sort()).toEqual(["1396", "550"]);
    expect(pageA.items.find((item) => item.tmdbId === "1396")?.label).toBe("Breaking Bad");

    // Duplicate add inside one folder is a no-op.
    await guest.addFolderItem(a.id, "1396", "tv");
    expect((await guest.getFolderItems(a.id)).total).toBe(2);

    // Removing from A leaves B untouched.
    await guest.removeFolderItem(a.id, "1396", "tv");
    expect((await guest.getFolderItems(a.id)).total).toBe(1);
    expect((await guest.getFolderItems(b.id)).total).toBe(1);
  });

  it("reorders items via setFolderOrder", async () => {
    const guest = getUserData();
    const folder = await guest.createFolder("Order");
    await guest.addFolderItem(folder.id, "1", "movie", "One");
    await guest.addFolderItem(folder.id, "2", "movie", "Two");
    await guest.addFolderItem(folder.id, "3", "movie", "Three");

    await guest.setFolderOrder(folder.id, [
      { tmdbId: "3", mediaType: "movie" },
      { tmdbId: "1", mediaType: "movie" },
      { tmdbId: "2", mediaType: "movie" },
    ]);

    const items = (await guest.getFolderItems(folder.id)).items;
    expect(items.map((item) => item.tmdbId)).toEqual(["3", "1", "2"]);
    // Labels survive the reorder.
    expect(items[0].label).toBe("Three");

    // Order replaces the list: entries absent from the payload are dropped.
    await guest.setFolderOrder(folder.id, [{ tmdbId: "2", mediaType: "movie" }]);
    expect((await guest.getFolderItems(folder.id)).items.map((item) => item.tmdbId)).toEqual(["2"]);
  });

  it("persists under the potok_guest_folders key", async () => {
    const guest = getUserData();
    await guest.createFolder("Persisted");
    const persisted = storedJson<{ id: string; name: string; items: unknown[] }[]>(GUEST_FOLDERS_KEY);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe("Persisted");
  });
});

describe("auth switch flips implementations", () => {
  it("uses the server impl and never touches localStorage when authenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "watching" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setUserSnapshot({ isAuth: true, id: "user-1", username: "neo" });

    const service = getUserData();
    expect(service).not.toBeInstanceOf(GuestUserData);

    await service.setStatus({ tmdbId: "550", mediaType: "movie", status: "watching", label: "ignored" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/library/status");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ tmdbId: "550", mediaType: "movie", status: "watching" });

    const status = await service.getStatus("550", "movie");
    expect(status).toEqual({ status: "watching" });
    expect(fetchMock.mock.calls[1][0]).toContain("/api/library/status/550/movie");

    expect(backingStore.size).toBe(0);
  });

  it("routes folder operations to the server endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "f1", name: "Name", itemCount: 0, updatedAt: "2026-11-03T00:00:00Z" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    setUserSnapshot({ isAuth: true, id: "user-1", username: "neo" });

    const service = getUserData();
    const folder = await service.createFolder("Name");
    expect(folder.id).toBe("f1");
    expect(fetchMock.mock.calls[0][0]).toContain("/api/library/folders");

    await service.addFolderItem("f1", "550", "movie");
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toContain("/api/library/folders/f1/items");
    expect(init.method).toBe("PUT");

    await service.setFolderOrder("f1", [{ tmdbId: "550", mediaType: "movie" }]);
    expect(fetchMock.mock.calls[2][0]).toContain("/api/library/folders/f1/order");
  });

  it("mid-session logout flips back to the guest impl", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    setUserSnapshot({ isAuth: true, id: "user-1", username: "neo" });
    expect(getUserData()).not.toBeInstanceOf(GuestUserData);

    setUserSnapshot({ isAuth: false, id: null, username: null });
    const guest = getUserData();
    expect(guest).toBeInstanceOf(GuestUserData);
    await guest.setStatus({ tmdbId: "550", mediaType: "movie", status: "watching" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backingStore.has(GUEST_STATUS_KEY)).toBe(true);
  });
});

describe("guest legacy sync surface (SyncApiClient)", () => {
  it("watchlist and favorites persist in localStorage", async () => {
    await SyncApiClient.addSyncWatchlist("550", "movie");
    await SyncApiClient.addSyncWatchlist("550", "movie");
    await SyncApiClient.addSyncFavorite("1396", "tv");

    expect(await SyncApiClient.fetchSyncWatchlist()).toEqual([
      expect.objectContaining({ tmdbId: "550", mediaType: "movie" }),
    ]);
    expect(await SyncApiClient.fetchSyncFavorites()).toEqual([
      expect.objectContaining({ tmdbId: "1396", mediaType: "tv" }),
    ]);

    await SyncApiClient.removeSyncWatchlist("550", "movie");
    expect(await SyncApiClient.fetchSyncWatchlist()).toEqual([]);
  });

  it("guest progress saves write the player resume keys and read back", async () => {
    await SyncApiClient.saveSyncProgress("550", "movie", undefined, undefined, 300, 1800);

    const progress = storedJson<{ progressSeconds: number; isCompleted: boolean }>("potok_progress:550:0:0");
    expect(progress.progressSeconds).toBe(300);
    expect(progress.isCompleted).toBe(false);
    expect(backingStore.get("potok_playback_resume:550:0:0")).toBe("300");

    // Completed progress clears the resume key.
    await SyncApiClient.saveSyncProgress("550", "movie", undefined, undefined, 1800, 1800);
    expect(backingStore.get("potok_playback_resume:550:0:0")).toBeUndefined();
    expect(storedJson<{ isCompleted: boolean }>("potok_progress:550:0:0").isCompleted).toBe(true);

    const history = await SyncApiClient.fetchSyncHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(expect.objectContaining({ tmdbId: "550", mediaType: "movie", progressSeconds: 1800 }));

    await SyncApiClient.removeSyncProgress("550", "movie");
    expect(backingStore.has("potok_progress:550:0:0")).toBe(false);
    expect(await SyncApiClient.fetchSyncHistory()).toEqual([]);
  });

  it("never calls fetch while unauthenticated", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await SyncApiClient.addSyncWatchlist("550", "movie");
    await SyncApiClient.saveSyncProgress("550", "movie");
    await SyncApiClient.fetchSyncHistory();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
