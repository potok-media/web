import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiTypes";
import type { PotokUser, DeviceCodeResponse, TraktProfile, TraktHistoryTransferStatus, AuthRequest, AuthResponse, TelegramWidgetAuth, TelegramStartCodeResponse, TelegramPollResponse } from "./ApiTypes";

/** Maps a failed history transfer response to an ApiError carrying the machine code (e.g. TRAKT_NOT_CONNECTED). */
async function traktTransferError(res: Response): Promise<ApiError> {
  const errData = await res.json().catch(() => ({}));
  return new ApiError(errData.error || "Request failed", res.status);
}

export class AuthApiClient {
  public static async login(request: AuthRequest): Promise<AuthResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Invalid username or password");
    }
    return res.json();
  }

  public static async register(request: AuthRequest): Promise<AuthResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to register");
    }
    return res.json();
  }

  public static async changePassword(body: { currentPassword: string; newPassword: string }): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/change-password`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to change password");
    }
  }

  public static async setCredentials(body: { username: string; password: string }): Promise<PotokUser> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/set-credentials`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to set credentials");
    }
    return res.json();
  }

  public static async telegramAuth(data: TelegramWidgetAuth): Promise<AuthResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Telegram authorization failed");
    }
    return res.json();
  }

  public static async linkTelegram(data: TelegramWidgetAuth): Promise<PotokUser> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/telegram/link`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to link Telegram");
    }
    return res.json();
  }

  public static async unlinkTelegram(): Promise<PotokUser> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/telegram/unlink`, {
      method: "POST",
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error("Failed to unlink Telegram");
    return res.json();
  }

  // Deep-link (bot) flow. Bearer is included automatically via ApiClient.headers, so a logged-in
  // caller gets a "link" code and an anonymous caller gets an "auth" code.
  public static async startTelegramCode(language?: string): Promise<TelegramStartCodeResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/telegram/start-code`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ language: language ?? "en" }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to start Telegram authorization");
    }
    return res.json();
  }

  public static async pollTelegramCode(code: string): Promise<TelegramPollResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/telegram/poll`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Telegram authorization failed");
    }
    return res.json();
  }

  public static async getMe(): Promise<PotokUser> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/me`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  }

  public static async getTraktDeviceCode(): Promise<DeviceCodeResponse> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/oauth/device/code`, {
      method: "POST",
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error("Failed to get Trakt device code");
    return res.json();
  }

  public static async getTraktToken(deviceCode: string): Promise<{ access_token: string }> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/oauth/device/token`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ code: deviceCode }),
    });
    if (!res.ok) {
      // Trakt answers the device poll with 400 and an error body: authorization_pending
      // (keep polling), expired_token / access_denied (stop and surface a real error).
      const errData = await res.json().catch(() => ({}));
      const traktError = typeof errData.error === "string" ? errData.error : null;
      if (res.status === 400 && (traktError === "authorization_pending" || traktError === null)) {
        throw new ApiError("PENDING", res.status);
      }
      if (traktError) throw new ApiError(traktError, res.status);
      throw new ApiError(res.status === 429 ? "PENDING" : "Request failed", res.status);
    }
    return res.json();
  }

  public static async traktLogout(): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/logout`, {
      method: "POST",
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error("Logout failed");
    return res.json();
  }

  // The combined transfer: ONE job covering history + watchlist + favorites.
  public static async traktStartAllExport(): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/transfer/export`, {
      method: "POST",
      headers: ApiClient.headers,
    });
    if (!res.ok) throw await traktTransferError(res);
  }

  public static async traktStartAllImport(wipe: boolean): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/transfer/import`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ wipe }),
    });
    if (!res.ok) throw await traktTransferError(res);
  }

  public static async traktAllTransferStatus(): Promise<TraktHistoryTransferStatus> {
    const res = await fetch(`${ApiClient.baseURL}/api/trakt/transfer-status`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new ApiError("Failed to fetch transfer status", res.status);
    return res.json();
  }

  public static async fetchTraktProfile(): Promise<TraktProfile> {
    const res = await fetch(`${ApiClient.baseURL}/api/library/profile`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new ApiError("Failed to fetch Trakt profile", res.status);
    return res.json();
  }
}
