/* eslint-disable react-refresh/only-export-components */
import React, { useContext } from "react";
import { SettingsProvider, SettingsContext, useSettings } from "./SettingsContext";
import type { SettingsContextType } from "./SettingsContext";
import { AuthProvider, AuthContext, useAuth } from "./AuthContext";
import type { AuthContextType } from "./AuthContext";
import {
  ConnectionHealthProvider,
  ConnectionHealthContext,
  ConnectionLatencyContext,
  useConnectionHealth,
  useConnectionLatency,
} from "./ConnectionHealthContext";
import type {
  ConnectionHealthContextType,
  ConnectionLatencyContextType,
} from "./ConnectionHealthContext";
import { PlaybackProvider, PlaybackContext, usePlayback } from "./PlaybackContext";
import type { PlaybackContextType } from "./PlaybackContext";

export type { ConnectionState, ActivePlayback, PlaylistItem } from "./playbackTypes";
export type { SettingsContextType, AuthContextType, ConnectionHealthContextType, ConnectionLatencyContextType, PlaybackContextType };

export {
  SettingsContext,
  SettingsProvider,
  useSettings,
  AuthContext,
  AuthProvider,
  useAuth,
  ConnectionHealthContext,
  ConnectionLatencyContext,
  ConnectionHealthProvider,
  useConnectionHealth,
  useConnectionLatency,
  PlaybackContext,
  PlaybackProvider,
  usePlayback,
};

export interface AppSettingsContextType
  extends SettingsContextType,
    AuthContextType,
    ConnectionHealthContextType,
    PlaybackContextType {}

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <AuthProvider>
      <ConnectionHealthProvider>
        <PlaybackProvider>{children}</PlaybackProvider>
      </ConnectionHealthProvider>
    </AuthProvider>
  </SettingsProvider>
);

export const useAppSettings = (): AppSettingsContextType => {
  const settings = useContext(SettingsContext);
  const auth = useContext(AuthContext);
  const health = useContext(ConnectionHealthContext);
  const playback = useContext(PlaybackContext);

  if (!settings || !auth || !health || !playback) {
    throw new Error(
      "useAppSettings must be used within nested Providers: Settings -> Auth -> ConnectionHealth -> Playback",
    );
  }

  return { ...settings, ...auth, ...health, ...playback };
};