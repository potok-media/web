import { ApiClient } from "../../network/ApiClient";
import type {
  SetFolderOrderInput,
  SetStatusInput,
  TitleStatus,
  UserDataMediaType,
  UserDataPage,
  UserDataService,
  UserFolder,
  UserFolderItem,
  UserFolderItemsPage,
  UserStatusRecord,
} from "./types";

/**
 * Authenticated implementation — talks to the server DB through the gateway (api/library/...).
 * Coded against the REST contract; the endpoints themselves are being built in parallel.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ApiClient.baseURL}${path}`, {
    ...init,
    headers: ApiClient.headers,
  });
  if (!res.ok) throw new Error(`User data request failed (Status ${res.status}): ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function pageQuery(page?: number, pageSize?: number): string {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asMediaType(value: unknown): UserDataMediaType {
  return value === "tv" ? "tv" : "movie";
}

/** Hydrated server items are MediaCard-like; adapt them onto the shared item shape. */
function adaptStatusItem(raw: unknown, status: TitleStatus): UserStatusRecord {
  const item = asRecord(raw);
  const tmdbId = item.tmdbId ?? item.id;
  const record: UserStatusRecord = {
    ...item,
    tmdbId: tmdbId != null ? String(tmdbId) : "",
    mediaType: asMediaType(item.mediaType),
    title: typeof item.title === "string" ? item.title : null,
    status,
  };
  if (item.posterPath !== undefined) record.posterPath = item.posterPath as string | null;
  if (typeof item.updatedAt === "string") record.updatedAt = item.updatedAt;
  if (item.workId !== undefined) record.workId = item.workId as string | null;
  return record;
}

function adaptPage<T>(payload: unknown, adapt: (raw: unknown) => T, page: number, pageSize: number): UserDataPage<T> {
  const body = asRecord(payload);
  const rawItems = Array.isArray(payload) ? payload : Array.isArray(body.items) ? body.items : [];
  const items = rawItems.map(adapt);
  const total = typeof body.total === "number" ? body.total : items.length;
  return { items, page, pageSize, total };
}

function adaptFolder(raw: unknown): UserFolder {
  const item = asRecord(raw);
  return {
    id: String(item.id ?? ""),
    name: typeof item.name === "string" ? item.name : "",
    itemCount: typeof item.itemCount === "number" ? item.itemCount : 0,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
  };
}

function adaptFolderItem(raw: unknown): UserFolderItem {
  const item = asRecord(raw);
  const entry: UserFolderItem = {
    tmdbId: item.tmdbId != null ? String(item.tmdbId) : "",
    mediaType: asMediaType(item.mediaType),
    addedAt: typeof item.addedAt === "string" ? item.addedAt : "",
  };
  if (typeof item.label === "string") entry.label = item.label;
  return entry;
}

export class ServerUserData implements UserDataService {
  async getStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<{ status: TitleStatus | null }> {
    const payload = await request<{ status?: TitleStatus | null }>(
      `/api/library/status/${encodeURIComponent(tmdbId)}/${encodeURIComponent(mediaType)}`,
    );
    return { status: payload?.status ?? null };
  }

  async setStatus(input: SetStatusInput): Promise<void> {
    await request("/api/library/status", {
      method: "PUT",
      body: JSON.stringify({
        tmdbId: input.tmdbId,
        mediaType: input.mediaType,
        status: input.status,
        ...(input.workId ? { workId: input.workId } : {}),
      }),
    });
  }

  async clearStatus(tmdbId: string, mediaType: UserDataMediaType): Promise<void> {
    await request("/api/library/status", {
      method: "PUT",
      body: JSON.stringify({ tmdbId, mediaType, status: null }),
    });
  }

  async listByStatus(
    status: TitleStatus,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<UserDataPage<UserStatusRecord>> {
    const payload = await request<unknown>(
      `/api/library/status/by-status/${encodeURIComponent(status)}${pageQuery(page, pageSize)}`,
    );
    return adaptPage(payload, (raw) => adaptStatusItem(raw, status), page, pageSize);
  }

  async listFolders(): Promise<UserFolder[]> {
    const payload = await request<unknown>("/api/library/folders");
    const raw = Array.isArray(payload) ? payload : [];
    return raw.map(adaptFolder);
  }

  async createFolder(name: string): Promise<UserFolder> {
    const payload = await request<unknown>("/api/library/folders", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return adaptFolder(payload);
  }

  async getFolderItems(
    folderId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<UserFolderItemsPage> {
    const payload = await request<unknown>(
      `/api/library/folders/${encodeURIComponent(folderId)}${pageQuery(page, pageSize)}`,
    );
    const body = asRecord(payload);
    const itemsPage = adaptPage(payload, adaptFolderItem, page, pageSize);
    const folder = body.folder ? adaptFolder(body.folder) : {
      id: folderId,
      name: typeof body.name === "string" ? body.name : "",
      itemCount: itemsPage.total,
      updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : "",
    };
    return { ...itemsPage, folder };
  }

  async renameFolder(folderId: string, name: string): Promise<void> {
    await request(`/api/library/folders/${encodeURIComponent(folderId)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    await request(`/api/library/folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
  }

  async addFolderItem(
    folderId: string,
    tmdbId: string,
    mediaType: UserDataMediaType,
  ): Promise<void> {
    await request(`/api/library/folders/${encodeURIComponent(folderId)}/items`, {
      method: "PUT",
      body: JSON.stringify({ tmdbId, mediaType }),
    });
  }

  async removeFolderItem(
    folderId: string,
    tmdbId: string,
    mediaType: UserDataMediaType,
  ): Promise<void> {
    await request(`/api/library/folders/${encodeURIComponent(folderId)}/items`, {
      method: "DELETE",
      body: JSON.stringify({ tmdbId, mediaType }),
    });
  }

  async setFolderOrder(folderId: string, items: SetFolderOrderInput[]): Promise<void> {
    await request(`/api/library/folders/${encodeURIComponent(folderId)}/order`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  }
}
