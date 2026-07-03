import type { ConnectionProfile } from "../network/ApiTypes";
import { logger } from "./logger";

export type { ConnectionProfile };


export interface IStorageService {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class LocalStorageService implements IStorageService {
  private memoryStore: Record<string, any> = {};

  public get<T>(key: string, defaultValue: T): T {
    try {
      if (typeof localStorage !== "undefined") {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        try {
          return JSON.parse(item) as T;
        } catch (e) {
          if (typeof defaultValue === "string") {
            return item as unknown as T;
          }
          throw e;
        }
      }
    } catch {
      return defaultValue;
    }
    return this.memoryStore[key] !== undefined ? this.memoryStore[key] : defaultValue;
  }

  public set<T>(key: string, value: T): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
        return;
      }
    } catch (e) {
      logger.error("Failed to write to localStorage:", e);
    }
    this.memoryStore[key] = value;
  }

  public remove(key: string): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      logger.error("Failed to remove from localStorage:", e);
    }
    delete this.memoryStore[key];
  }
}

export const Storage = new LocalStorageService();
