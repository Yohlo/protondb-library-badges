import { IconsModule, Millennium, definePlugin } from '@steambrew/client';
import { initStatRow } from './features/stat-row';
import { initSidebarDots } from './features/sidebar-dots';
import { initDotsToggle } from './features/dots-toggle';
import { initLibraryFilter } from './features/library-filter';
import { SettingsPanel } from './features/settings/components/settings-panel';
import { PopupContext } from './lib/steam';
import { log } from './utils/logger';

const MAIN_WINDOW_PREFIX = 'SP Desktop_';
const MAIN_WINDOW_NAME = 'SP Desktop_uid0';

const FEATURES = [
  ['statRow', initStatRow],
  ['sidebarDots', initSidebarDots],
  ['dotsToggle', initDotsToggle],
  ['libraryFilter', initLibraryFilter],
] as const;

const teardowns = new Map<Document, Array<() => void>>();

function attachToWindow(context: PopupContext): void {
  const name = context.m_strName;
  const doc = context.m_popup?.document;
  if (!name?.startsWith(MAIN_WINDOW_PREFIX) || !doc?.body || teardowns.has(doc)) return;

  log('Attaching to', name);
  const stops: Array<() => void> = [];
  for (const [label, init] of FEATURES) {
    try {
      stops.push(init(doc));
    } catch (e) {
      log(label, 'init failed', e);
    }
  }
  teardowns.set(doc, stops);
}

function detachAll(): void {
  for (const stops of teardowns.values()) {
    for (const stop of stops) {
      try {
        stop();
      } catch (e) {
        log('teardown failed', e);
      }
    }
  }
  teardowns.clear();
}

function findExistingMainWindow(): PopupContext | undefined {
  try {
    return window.g_PopupManager?.GetExistingPopup?.(MAIN_WINDOW_NAME);
  } catch (e) {
    log('existing-window lookup failed', e);
    return undefined;
  }
}

export default definePlugin(() => {
  Millennium.AddWindowCreateHook?.((context) => attachToWindow(context as PopupContext));
  const existing = findExistingMainWindow();
  if (existing) attachToWindow(existing);

  return {
    title: 'ProtonDB Library Badges',
    icon: <IconsModule.Settings />,
    content: <SettingsPanel />,
    onDismount: detachAll,
  };
});
