import React from 'react';
import { findClassModule, findModuleExport, getReactInstance } from '@steambrew/client';

export interface AppOverview {
  appid: number;
  BIsModOrShortcut?(): boolean;
}

export interface FilterGroup {
  rgOptions: unknown[];
  bAcceptUnion: boolean;
}

export interface AppFilter {
  MatchesImpl(app: AppOverview): boolean;
  MatchesScoredImpl(app: AppOverview): number;
  SelectOption(group: number, option: unknown, selected: boolean): void;
  BIsSelected(group: number, option: unknown): boolean;
  m_filterSpec?: { strSearchText?: string; filterGroups?: FilterGroup[] };
}

export interface StoredFilterSpec {
  filterGroups?: Array<{ rgOptions?: unknown[] } | undefined>;
}

export interface FilterClass {
  FromStorageFormat(spec: StoredFilterSpec): AppFilter | null;
}

export interface Collection {
  id: string;
  bIsDynamic: boolean;
  m_filter?: AppFilter;
  UpdateAllApps(): void;
}

export interface ReactRoot {
  render(node: React.ReactNode): void;
  unmount(): void;
}

export interface PopupContext {
  m_strName?: string;
  m_popup?: Window;
}

declare global {
  interface Window {
    uiStore?: { collectionsAppFilter?: AppFilter; currentAppFilter?: AppFilter };
    collectionStore?: {
      allAppsCollection?: { visibleApps?: AppOverview[] };
      userCollections?: Collection[];
      m_cloudStorageMap?: { GetObject(id: string): { filterSpec?: StoredFilterSpec } | null };
    };
    MainWindowBrowserManager?: { m_lastLocation?: { pathname?: string } };
    g_PopupManager?: { GetExistingPopup?(name: string): PopupContext | undefined };
  }
}

export const getUIStore = () => window.uiStore;
export const getCollectionStore = () => window.collectionStore;

export const isSteamApp = (appId: unknown): appId is number =>
  typeof appId === 'number' && Number.isInteger(appId) && appId > 0 && appId < 0x80000000;

export const isRatable = (app: AppOverview | undefined): app is AppOverview =>
  !!app && isSteamApp(app.appid) && !app.BIsModOrShortcut?.();

export function libraryApps(): AppOverview[] {
  return (getCollectionStore()?.allAppsCollection?.visibleApps ?? []).filter(isRatable);
}

export function getLibraryPath(): string | null {
  return window.MainWindowBrowserManager?.m_lastLocation?.pathname ?? null;
}

export function libraryAppIdFromPath(path: string | null): number | null {
  const match = path?.match(/\/library\/app\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function openProtonDB(appId: number): void {
  window.open(`steam://openurl_external/https://www.protondb.com/app/${appId}`);
}

export function mountReact(host: Element, node: React.ReactNode): ReactRoot {
  const reactDom = window.SP_REACTDOM as { createRoot(host: Element): ReactRoot };
  const root = reactDom.createRoot(host);
  root.render(node);
  return root;
}

type Props = Record<string, unknown>;

interface FiberLike {
  memoizedProps?: Props;
  return?: FiberLike | null;
}

const MAX_FIBER_DEPTH = 40;

export function findFiberProps<T extends Props>(el: Element, predicate: (props: Props) => props is T): T | null {
  let fiber: FiberLike | null | undefined;
  try {
    fiber = getReactInstance(el) as FiberLike | null;
  } catch {
    return null;
  }
  for (let depth = 0; fiber && depth < MAX_FIBER_DEPTH; depth++, fiber = fiber.return) {
    const props = fiber.memoizedProps;
    if (props && predicate(props)) return props;
  }
  return null;
}

function appIdFromProps(props: Props): number | null {
  for (const candidate of [props, props.item, props.appOverview]) {
    const appId = (candidate as { appid?: unknown } | undefined)?.appid;
    if (typeof appId === 'number') return appId;
  }
  return null;
}

export function findAppIdFromElement(el: Element): number | null {
  const props = findFiberProps(el, (candidate): candidate is Props => appIdFromProps(candidate) !== null);
  return props ? appIdFromProps(props) : null;
}

export function classModuleFinder<K extends string>(...keys: K[]): () => Record<K, string> | null {
  let found: Record<K, string> | null = null;
  return () => {
    if (found) return found;
    const module = findClassModule((m: Record<string, unknown>) => keys.every((k) => typeof m[k] === 'string'));
    found = (module as Record<K, string> | undefined) ?? null;
    return found;
  };
}

export function moduleExportFinder<T>(predicate: (candidate: unknown) => boolean): () => T | null {
  let found: T | null | undefined;
  return () => {
    if (found === undefined) {
      try {
        found = (findModuleExport(predicate) as T | undefined) ?? null;
      } catch {
        found = null;
      }
    }
    return found;
  };
}
