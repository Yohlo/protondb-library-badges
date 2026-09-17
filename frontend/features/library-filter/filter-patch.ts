import { TIERS, Tier } from '../../config/tiers';
import { AppFilter, AppOverview, Collection, FilterClass, FilterGroup, StoredFilterSpec, getCollectionStore, getUIStore, isRatable } from '../../lib/steam';
import { cachedRating, requestRating } from '../../stores/ratings';
import { throttle } from '../../utils/throttle';
import { log } from '../../utils/logger';

export const PROTONDB_GROUP = 9;

export const tierOption = (tier: Tier): number => TIERS.indexOf(tier);

export function ensureTierGroup(filter: AppFilter): FilterGroup | null {
  const groups = filter.m_filterSpec?.filterGroups;
  if (!groups) return null;
  while (groups.length <= PROTONDB_GROUP) groups.push({ rgOptions: [], bAcceptUnion: true });
  return groups[PROTONDB_GROUP];
}

const tierOptionsOf = (filter: AppFilter | undefined) => filter?.m_filterSpec?.filterGroups?.[PROTONDB_GROUP]?.rgOptions;

export function clearTierSelection(filter: AppFilter | undefined): void {
  const options = tierOptionsOf(filter);
  if (options?.length) options.splice(0, options.length);
}

const hasTierSelection = (filter: AppFilter | undefined): boolean => !!tierOptionsOf(filter)?.length;

const dynamicCollectionsWithTiers = (): Collection[] =>
  (getCollectionStore()?.userCollections ?? []).filter((collection) => collection.bIsDynamic && hasTierSelection(collection.m_filter));

export const rematchLibrary = throttle(() => {
  const options = tierOptionsOf(getUIStore()?.currentAppFilter);
  if (options?.length) options.splice(0, options.length, ...options);
  for (const collection of dynamicCollectionsWithTiers()) collection.UpdateAllApps();
}, 200);

function restoreTierSelection(filter: AppFilter, spec: StoredFilterSpec | undefined): void {
  const saved = spec?.filterGroups?.[PROTONDB_GROUP]?.rgOptions ?? [];
  if (!saved.length || hasTierSelection(filter)) return;
  ensureTierGroup(filter)?.rgOptions.push(...saved);
}

function restoreCollections(): void {
  const store = getCollectionStore();
  for (const collection of store?.userCollections ?? []) {
    if (!collection.bIsDynamic || !collection.m_filter || hasTierSelection(collection.m_filter)) continue;
    restoreTierSelection(collection.m_filter, store?.m_cloudStorageMap?.GetObject(collection.id)?.filterSpec);
    if (hasTierSelection(collection.m_filter)) collection.UpdateAllApps();
  }
}

function passesTierFilter(filter: AppFilter, app: AppOverview): boolean {
  const options = tierOptionsOf(filter);
  if (!options?.length) return true;
  if (!isRatable(app)) return false;
  const rating = cachedRating(app.appid);
  if (!rating) {
    requestRating(app.appid, 'low');
    return false;
  }
  return options.includes(tierOption(rating.tier));
}

type MatchMethod = 'MatchesImpl' | 'MatchesScoredImpl';
type MatchFn = (this: AppFilter, app: AppOverview) => boolean | number;
type Patchable = Record<MatchMethod, MatchFn>;

let restorePatch: (() => void) | null = null;

function prototypeChain(instance: object): object[] {
  const chain: object[] = [];
  for (let proto = Object.getPrototypeOf(instance); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) chain.push(proto);
  return chain;
}

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

function baseClassDefining(instance: object, method: MatchMethod): Patchable | null {
  const owners = prototypeChain(instance).filter((proto) => hasOwn(proto, method));
  return (owners[owners.length - 1] as Patchable | undefined) ?? null;
}

function patchStorageFormat(instance: object): Array<() => void> {
  const restores: Array<() => void> = [];
  for (const proto of prototypeChain(instance)) {
    const cls = proto.constructor as unknown as FilterClass;
    if (!hasOwn(cls, 'FromStorageFormat')) continue;
    const original = cls.FromStorageFormat;
    cls.FromStorageFormat = function (spec) {
      const filter = original.call(this, spec);
      if (filter) restoreTierSelection(filter, spec);
      return filter;
    };
    restores.push(() => {
      cls.FromStorageFormat = original;
    });
  }
  return restores;
}

export function installFilterPatch(): boolean {
  if (restorePatch) return true;
  const filter = getUIStore()?.collectionsAppFilter;
  if (!filter) return false;
  const target = baseClassDefining(filter, 'MatchesImpl');
  if (!target) {
    log('Could not find MatchesImpl on the app filter prototype chain');
    return false;
  }

  const originals = { MatchesImpl: target.MatchesImpl, MatchesScoredImpl: target.MatchesScoredImpl };
  const wrap = (name: MatchMethod, miss: boolean | number) => {
    const original = originals[name];
    target[name] = function (app) {
      const result = original.call(this, app);
      return result && !passesTierFilter(this, app) ? miss : result;
    };
  };
  wrap('MatchesImpl', false);
  wrap('MatchesScoredImpl', 0);
  const restoreStorage = patchStorageFormat(filter);
  restoreCollections();

  restorePatch = () => {
    target.MatchesImpl = originals.MatchesImpl;
    target.MatchesScoredImpl = originals.MatchesScoredImpl;
    restoreStorage.forEach((restore) => restore());
    restorePatch = null;
  };
  return true;
}

export function uninstallFilterPatch(): boolean {
  if (!restorePatch) return false;
  restorePatch();
  return true;
}
