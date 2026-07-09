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
  showHUD: (type: HUDType, message: string) => void;
  playVideo: (playback: ActivePlayback) => void;
  navigate: NavigateFunction;
  setAccentTheme: (theme: string) => void;
  triggerPhysicalRemoval: (pluginId: string) => void;
}

export type MessageSource = MessageEventSource;