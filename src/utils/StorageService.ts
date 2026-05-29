import type { ConnectionProfile } from "../network/ApiTypes";

export type { ConnectionProfile };


export interface IStorageService {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export class LocalStorageService implements IStorageService {
  public get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  public set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
  }

  public remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to remove from localStorage:", e);
    }
  }
}

export const Storage = new LocalStorageService();
