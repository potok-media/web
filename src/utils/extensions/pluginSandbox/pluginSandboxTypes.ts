import type { NavigateFunction } from "react-router-dom";
import type { RegisteredExtension } from "@potok/sdk-types";
import type { HUDType } from "../../../context/hudContextState";
import type { ActivePlayback, PlaylistItem } from "../../../context/playbackTypes";
import type { ConnectionProfile } from "../../../network/ApiTypes";

export interface PotokCustomTheme {
  id: string;
  variables: Record<string, string>;
}

export interface PluginSandboxWindowBridge {
  __potok_custom_themes?: Map<string, PotokCustomTheme>;
  potok_playlist_override?: PlaylistItem[] | null;
  potok_playlist_resolve?: (item: PlaylistItem) => Promise<unknown>;
  /** Identifies which flow installed potok_playlist_resolve so others don't clobber it. */
  __potok_playlist_resolve_owner?: string;
}

export interface PluginSandboxMessage {
  source: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface PluginSandboxMessageContext {
  activeExtensions: RegisteredExtension[];
  activeProfile: ConnectionProfile | null;
  activePlayback: ActivePlayback | null;
  showHUD: (type: HUDType, message: string, durationMs?: number) => void;
  playVideo: (playback: ActivePlayback) => void;
  stopVideo: () => void;
  navigate: NavigateFunction;
  setAccentTheme: (theme: string) => void;
  copyText: (text: string) => void;
  openUrl: (url: string) => void;
  triggerPhysicalRemoval: (pluginId: string) => void;
}

export type MessageSource = MessageEventSource;
