import { Storage } from "../StorageService";
import type {
  SetFolderOrderInput,
  SetStatusInput,
  TitleStatus,
  UserDataMediaItem,
  UserDataMediaType,
  UserDataPage,
  UserDataService,
  UserFolder,
  UserFolderItem,
  UserFolderItemsPage,
  UserStatusRecord,
} from "./types";

/**
 * Guest implementation: everything lives in localStorage under potok_guest_* keys, plain,
 * with no sync-later guarantees (owner decision). Record shapes mirror the server contract
 * and persist display labels + updatedAt so list views render without a TMDB round-trip.
 */

export const GUEST_STATUS_KEY = "potok_guest_status";
export const GUEST_FOLDERS_KEY = "potok_guest_folders";

type StatusStore = Record<string, UserStatusRecord>;

interface StoredFolder {
  id: string;
  name: string;
  updatedAt: string;
  items: UserFolderItem[];
}

function statusKey(tmdbId: string, mediaType: string): string {
  return `${mediaType}:${tmdbId}`;
}

function folderItemKey(tmdbId: string, mediaType: string): string {
  return `${mediaType}:${tmdbId}`;
}

function readStatusStore(): StatusStore {
  const raw = Storage.get<StatusStore>(GUEST_STATUS_KEY, {});
  return raw && typeof raw === "object" ? raw : {};
}

function writeStatusStore(store: StatusStore): void {
  Storage.set(GUEST_STATUS_KEY, store);
}

function readFolders(): StoredFolder[] {
  const raw = Storage.get<StoredFolder[]>(GUEST_FOLDERS_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

function writeFolders(folders: StoredFolder[]): void {
  Storage.set(GUEST_FOLDERS_KEY, folders);
}

function toFolder(stored: StoredFolder): UserFolder {
  return {
    id: stored.id,
    name: stored.name,
    itemCount: stored.items.length,
    updatedAt: stored.updatedAt,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number): UserDataPage<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: items.length,
  };
}

function newFolderId(): string {
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class GuestUserData implements UserDataService {
  async getStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<{ status: TitleStatus | null }> {
    const record = readStatusStore()[statusKey(tmdbId, mediaType)];
    return { status: record?.status ?? null };
  }

  async setStatus(input: SetStatusInput): Promise<void> {
    const store = readStatusStore();
    store[statusKey(input.tmdbId, input.mediaType)] = {
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      status: input.status,
      workId: input.workId ?? null,
      title: input.label ?? null,
      posterPath: input.posterPath ?? null,
      updatedAt: new Date().toISOString(),
    };
    writeStatusStore(store);
  }

  async clearStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<void> {
    const store = readStatusStore();
    if (!(statusKey(tmdbId, mediaType) in store)) return;
    delete store[statusKey(tmdbId, mediaType)];
    writeStatusStore(store);
  }

  async listByStatus(
    status: TitleStatus,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<UserDataPage<UserStatusRecord>> {
    const records = Object.values(readStatusStore())
      .filter((record) => record.status === status)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return paginate(records, page, pageSize);
  }

  async listFolders(): Promise<UserFolder[]> {
    return readFolders()
      .map(toFolder)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createFolder(name: string): Promise<UserFolder> {
    const folders = readFolders();
    const stored: StoredFolder = {
      id: newFolderId(),
      name,
      updatedAt: new Date().toISOString(),
      items: [],
    };
    folders.push(stored);
    writeFolders(folders);
    return toFolder(stored);
  }

  async getFolderItems(
    folderId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<UserFolderItemsPage> {
    const stored = readFolders().find((folder) => folder.id === folderId);
    if (!stored) throw new Error(`Folder not found: ${folderId}`);
    return { ...paginate(stored.items, page, pageSize), folder: toFolder(stored) };
  }

  async renameFolder(folderId: string, name: string): Promise<void> {
    const folders = readFolders();
    const stored = folders.find((folder) => folder.id === folderId);
    if (!stored) throw new Error(`Folder not found: ${folderId}`);
    stored.name = name;
    stored.updatedAt = new Date().toISOString();
    writeFolders(folders);
  }

  async deleteFolder(folderId: string): Promise<void> {
    const folders = readFolders();
    const next = folders.filter((folder) => folder.id !== folderId);
    if (next.length === folders.length) throw new Error(`Folder not found: ${folderId}`);
    writeFolders(next);
  }

  async addFolderItem(
    folderId: string,
    tmdbId: string,
    mediaType: UserDataMediaType,
    label?: string,
  ): Promise<void> {
    const folders = readFolders();
    const stored = folders.find((folder) => folder.id === folderId);
    if (!stored) throw new Error(`Folder not found: ${folderId}`);
    const key = folderItemKey(tmdbId, mediaType);
    if (stored.items.some((item) => folderItemKey(item.tmdbId, item.mediaType) === key)) return;
    const item: UserFolderItem = { tmdbId, mediaType, addedAt: new Date().toISOString() };
    if (label) item.label = label;
    stored.items.push(item);
    stored.updatedAt = new Date().toISOString();
    writeFolders(folders);
  }

  async removeFolderItem(
    folderId: string,
    tmdbId: string,
    mediaType: UserDataMediaType,
  ): Promise<void> {
    const folders = readFolders();
    const stored = folders.find((folder) => folder.id === folderId);
    if (!stored) throw new Error(`Folder not found: ${folderId}`);
    const key = folderItemKey(tmdbId, mediaType);
    const next = stored.items.filter((item) => folderItemKey(item.tmdbId, item.mediaType) !== key);
    if (next.length === stored.items.length) return;
    stored.items = next;
    stored.updatedAt = new Date().toISOString();
    writeFolders(folders);
  }

  async setFolderOrder(folderId: string, items: SetFolderOrderInput[]): Promise<void> {
    const folders = readFolders();
    const stored = folders.find((folder) => folder.id === folderId);
    if (!stored) throw new Error(`Folder not found: ${folderId}`);
    const byKey = new Map(stored.items.map((item) => [folderItemKey(item.tmdbId, item.mediaType), item]));
    // Full-list replacement, matching the server contract: entries absent from `items` are removed.
    stored.items = items
      .map((input) => byKey.get(folderItemKey(input.tmdbId, input.mediaType)))
      .filter((item): item is UserFolderItem => !!item);
    stored.updatedAt = new Date().toISOString();
    writeFolders(folders);
  }
}

/** Shared guest item normalization — the UI layer renders these for guests. */
export function toGuestMediaItem(record: UserStatusRecord): UserDataMediaItem {
  return {
    tmdbId: record.tmdbId,
    mediaType: record.mediaType,
    title: record.title,
    posterPath: record.posterPath,
  };
}
