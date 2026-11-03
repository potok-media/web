/**
 * Unified user-data layer contract. One async interface, two implementations switched by
 * PotokSDK.user.isAuth(): authenticated → server DB (api/library/...), guest → localStorage
 * (potok_guest_* keys). Shapes mirror the server contract exactly so UI code never branches
 * on auth. A later UI agent builds profile/status/folder screens on top of this.
 */

export type TitleStatus = "watching" | "completed" | "planned" | "on_hold" | "dropped";

export type UserDataMediaType = "movie" | "tv";

/** Hydrated list item. The server impl returns MediaCard-compatible fields on top of this base. */
export interface UserDataMediaItem {
  tmdbId: string;
  mediaType: UserDataMediaType;
  title: string | null;
  posterPath?: string | null;
  /** Hydrated server cards carry a ready poster reference (full URL or TMDB path) instead. */
  posterSrc?: string | null;
}

export interface UserDataPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserStatusRecord extends UserDataMediaItem {
  status: TitleStatus;
  workId?: string | null;
  updatedAt?: string;
}

export interface SetStatusInput {
  tmdbId: string;
  mediaType: UserDataMediaType;
  status: TitleStatus;
  /** ARM work identity, when the title resolved to one. */
  workId?: string;
  /** Display label persisted for guests (server ignores it — it hydrates from TMDB). */
  label?: string;
  posterPath?: string;
}

export interface UserFolder {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: string;
}

export interface UserFolderItem {
  tmdbId: string;
  mediaType: UserDataMediaType;
  /** Display label persisted for guests (server ignores it). */
  label?: string | null;
  addedAt: string;
}

export interface UserFolderItemsPage extends UserDataPage<UserFolderItem> {
  folder: UserFolder;
}

export interface SetFolderOrderInput {
  tmdbId: string;
  mediaType: UserDataMediaType;
}

export interface UserDataService {
  /** GET api/library/status/{tmdbId}/{mediaType} → { status }. */
  getStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<{ status: TitleStatus | null }>;
  /** PUT api/library/status { tmdbId, mediaType, status, workId? }. */
  setStatus(input: SetStatusInput): Promise<void>;
  /** PUT api/library/status with status null. */
  clearStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<void>;
  /** GET api/library/status/by-status/{status}?page=&pageSize=. */
  listByStatus(status: TitleStatus, page?: number, pageSize?: number): Promise<UserDataPage<UserStatusRecord>>;
  /** GET api/library/folders → [{ id, name, itemCount, updatedAt }]. */
  listFolders(): Promise<UserFolder[]>;
  /** POST api/library/folders { name }. */
  createFolder(name: string): Promise<UserFolder>;
  /** GET api/library/folders/{id}?page=&pageSize=. */
  getFolderItems(folderId: string, page?: number, pageSize?: number): Promise<UserFolderItemsPage>;
  /** PATCH api/library/folders/{id} { name }. */
  renameFolder(folderId: string, name: string): Promise<void>;
  /** DELETE api/library/folders/{id}. */
  deleteFolder(folderId: string): Promise<void>;
  /** PUT api/library/folders/{id}/items { tmdbId, mediaType }. */
  addFolderItem(folderId: string, tmdbId: string, mediaType: UserDataMediaType, label?: string): Promise<void>;
  /** DELETE api/library/folders/{id}/items { tmdbId, mediaType }. */
  removeFolderItem(folderId: string, tmdbId: string, mediaType: UserDataMediaType): Promise<void>;
  /** PUT api/library/folders/{id}/order — replaces the folder's item order with the given list. */
  setFolderOrder(folderId: string, items: SetFolderOrderInput[]): Promise<void>;
}
