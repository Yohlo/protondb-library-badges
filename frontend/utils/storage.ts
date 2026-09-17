import { log } from './logger';

export function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (e) {
    log('unreadable storage entry', key, e);
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    log('storage write failed', key, e);
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    log('storage remove failed', key, e);
  }
}
