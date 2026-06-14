import type { ConnectionProfile } from "../network/ApiTypes";

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
        return item ? JSON.parse(item) : defaultValue;
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
      console.error("Failed to write to localStorage:", e);
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
      console.error("Failed to remove from localStorage:", e);
    }
    delete this.memoryStore[key];
  }
}

export const Storage = new LocalStorageService();
