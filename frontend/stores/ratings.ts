import { callable } from '@steambrew/client';
import { Rating, normalizeTier } from '../config/tiers';
import { isSteamApp } from '../lib/steam';
import { log } from '../utils/logger';
import { readJson, removeKey, writeJson } from '../utils/storage';

const fetchSummary = callable<[{ appId: string }], string>('fetch_protondb_data');
const clearBackendCache = callable<[], string>('clear_protondb_cache');

const KEY_PREFIX = 'protondb-lib:';
const STORED_TTL_MS = 7 * 24 * 3_600_000;
const RETRY_AFTER_MS = 10 * 60_000;
const CONCURRENCY = 4;

type Priority = 'high' | 'low';
type Listener = (appId: number, rating: Rating | null) => void;
interface RawSummary {
  tier?: unknown;
  total?: unknown;
}
interface StoredRating {
  ts: number;
  data: RawSummary;
}
interface PendingRequest {
  promise: Promise<Rating | null>;
  settle: (rating: Rating | null) => void;
}

const cache = new Map<number, Rating>();
const failedAt = new Map<number, number>();
const pending = new Map<number, PendingRequest>();
const highQueue: number[] = [];
const lowQueue: number[] = [];
const listeners = new Set<Listener>();
let running = 0;

const storageKey = (appId: number) => KEY_PREFIX + appId;

function toRating(raw: RawSummary): Rating {
  return { tier: normalizeTier(raw.tier), total: typeof raw.total === 'number' ? raw.total : 0 };
}

function readStored(appId: number): Rating | undefined {
  const stored = readJson<StoredRating>(storageKey(appId));
  if (!stored?.data || typeof stored.ts !== 'number') return undefined;
  if (Date.now() - stored.ts > STORED_TTL_MS) {
    removeKey(storageKey(appId));
    return undefined;
  }
  return toRating(stored.data);
}

export function cachedRating(appId: number): Rating | undefined {
  const rating = cache.get(appId) ?? readStored(appId);
  if (rating) cache.set(appId, rating);
  return rating;
}

function store(appId: number, rating: Rating): void {
  cache.set(appId, rating);
  writeJson(storageKey(appId), { ts: Date.now(), data: rating });
}

const recentlyFailed = (appId: number): boolean => Date.now() - (failedAt.get(appId) ?? -Infinity) < RETRY_AFTER_MS;

export function requestRating(appId: number, priority: Priority = 'low'): Promise<Rating | null> {
  if (!isSteamApp(appId)) return Promise.resolve(null);
  const cached = cachedRating(appId);
  if (cached) return Promise.resolve(cached);
  if (recentlyFailed(appId)) return Promise.resolve(null);

  const existing = pending.get(appId);
  if (existing) {
    if (priority === 'high') promote(appId);
    return existing.promise;
  }

  let settle: PendingRequest['settle'] = () => {};
  const promise = new Promise<Rating | null>((resolve) => (settle = resolve));
  pending.set(appId, { promise, settle });
  if (priority === 'high') highQueue.unshift(appId);
  else lowQueue.push(appId);
  drain();
  return promise;
}

function promote(appId: number): void {
  const index = lowQueue.indexOf(appId);
  if (index < 0) return;
  lowQueue.splice(index, 1);
  highQueue.unshift(appId);
}

function drain(): void {
  while (running < CONCURRENCY) {
    const appId = highQueue.shift() ?? lowQueue.shift();
    if (appId === undefined) return;
    running++;
    fetchOne(appId).finally(() => {
      running--;
      drain();
    });
  }
}

async function fetchOne(appId: number): Promise<void> {
  const rating = await fetchRating(appId);
  if (rating) store(appId, rating);
  else failedAt.set(appId, Date.now());

  pending.get(appId)?.settle(rating);
  pending.delete(appId);
  notify(appId, rating);
}

async function fetchRating(appId: number): Promise<Rating | null> {
  try {
    const parsed: unknown = JSON.parse(await fetchSummary({ appId: String(appId) }));
    if (!parsed || typeof parsed !== 'object') return null;
    const summary = parsed as RawSummary;
    return typeof summary.tier === 'string' && summary.tier !== 'error' ? toRating(summary) : null;
  } catch (e) {
    log('fetch failed for', appId, e);
    return null;
  }
}

function notify(appId: number, rating: Rating | null): void {
  for (const listener of listeners) {
    try {
      listener(appId, rating);
    } catch (e) {
      log('rating listener error', e);
    }
  }
}

export async function clearRatingCache(): Promise<void> {
  const evicted = [...cache.keys()];
  cache.clear();
  failedAt.clear();
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(KEY_PREFIX) && isSteamApp(Number(key.slice(KEY_PREFIX.length)))) removeKey(key);
  }
  try {
    await clearBackendCache();
  } catch (e) {
    log('backend cache clear failed', e);
  }
  for (const appId of evicted) notify(appId, null);
}

export function onRatingUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
