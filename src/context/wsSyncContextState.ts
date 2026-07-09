import { createContext } from "react";
import type { MediaSyncCallback } from "./syncEventTypes";

export interface WSSyncContextType {
  clientId: string;
  subscribeToMedia: (mediaId: number, mediaType: string, callback: MediaSyncCallback) => () => void;
}

export const WSSyncContext = createContext<WSSyncContextType | null>(null);