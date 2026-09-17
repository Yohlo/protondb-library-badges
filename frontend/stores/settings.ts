import { readJson, writeJson } from '../utils/storage';

export interface Settings {
  statRow: boolean;
  sidebarDots: boolean;
  filterButton: boolean;
}

type Listener = (settings: Settings) => void;

const KEY = 'protondb-lib:settings';
const DEFAULTS: Settings = { statRow: true, sidebarDots: true, filterButton: true };
const listeners = new Set<Listener>();
let current: Settings | null = null;

function storedOverrides(): Partial<Settings> {
  const stored = readJson<Partial<Settings>>(KEY) ?? {};
  const overrides: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const value = stored[key];
    if (typeof value === 'boolean') overrides[key] = value;
  }
  return overrides;
}

export function getSettings(): Settings {
  return (current ??= { ...DEFAULTS, ...storedOverrides() });
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const next = { ...getSettings(), [key]: value };
  current = next;
  writeJson(KEY, next);
  listeners.forEach((listener) => listener(next));
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
