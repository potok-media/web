import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiTypes";
import type { PotokUser, DeviceCodeResponse, TraktProfile, AuthRequest, AuthResponse, TelegramWidgetAuth, TelegramStartCodeResponse, TelegramPollResponse } from "./ApiTypes";

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

  public static async updateSyncStrategy(strategy: string): Promise<PotokUser> {
    const res = await fetch(`${ApiClient.baseURL}/api/auth/sync-strategy`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ strategy }),
    });
    if (!res.ok) throw new Error("Failed to update sync strategy");
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
    if (res.status === 400) {
      throw new Error("UNAUTHORIZED");
    }
    if (!res.ok) throw new Error("Request failed");
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

  public static async fetchTraktProfile(): Promise<TraktProfile> {
    const res = await fetch(`${ApiClient.baseURL}/api/library/profile`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new ApiError("Failed to fetch Trakt profile", res.status);
    return res.json();
  }
}
