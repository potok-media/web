import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiTypes";
import type { PatchOperation } from "./ApiTypes";

export class SettingsApiClient {
  /**
   * Applies patch operations to a profile's settings on the server.
   *
   * @param profileId The ID of the connection profile
   * @param patches The queue of PatchOperations to apply
   */
  public static async applyPatches(profileId: string, patches: PatchOperation[]): Promise<void> {
    if (patches.length === 0) return;

    const baseURLClean = ApiClient.baseURL.replace(/\/$/, "");
    const url = `${baseURLClean}/api/profiles/${encodeURIComponent(profileId)}/settings/patch`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: ApiClient.headers,
      body: JSON.stringify(patches),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ApiError(
        `Failed to apply settings patches for profile ${profileId}`,
        response.status,
        errorText
      );
    }
  }
}
