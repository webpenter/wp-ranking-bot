import { IStorageAdapter } from './storage-interface';

/**
 * Storage adapter with automatic detection:
 * - Uses chrome.storage.local when running inside Chrome Extension context
 * - Fallbacks to localStorage when running in standalone web dashboard / GitHub Pages
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private isChromeStorage(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.storage !== 'undefined' &&
      typeof chrome.storage.local !== 'undefined'
    );
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (this.isChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome storage get error:', chrome.runtime.lastError);
            resolve(this.getFromLocalStorage<T>(key));
          } else {
            resolve(result[key] !== undefined ? (result[key] as T) : null);
          }
        });
      });
    }
    return this.getFromLocalStorage<T>(key);
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (this.isChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome storage set error:', chrome.runtime.lastError);
            this.setInLocalStorage<T>(key, value);
          }
          resolve();
        });
      });
    }
    this.setInLocalStorage<T>(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (this.isChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          this.removeFromLocalStorage(key);
          resolve();
        });
      });
    }
    this.removeFromLocalStorage(key);
  }

  async clear(): Promise<void> {
    if (this.isChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          }
          resolve();
        });
      });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  }

  private getFromLocalStorage<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private setInLocalStorage<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  private removeFromLocalStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }
}

export const storageAdapter = new LocalStorageAdapter();
