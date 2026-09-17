import { ReactRoot, classModuleFinder, getLibraryPath, libraryAppIdFromPath, mountReact } from '../../lib/steam';
import { getSettings, subscribeSettings } from '../../stores/settings';
import { injectStyles, observeThrottled } from '../../utils/dom';
import { ProtonDBStat } from './components/protondb-stat';

const STYLE_ID = 'protondb-stat-styles';
const CSS = `
.pdb-stat-icon svg { color: hsla(0,0%,100%,.4); }
.pdb-stat-icon svg path, .pdb-stat-icon svg circle { fill: hsla(0,0%,100%,.4); stroke: none; }
`;

const statClasses = classModuleFinder(
  'GameStat',
  'GameStatsSection',
  'GameStatIcon',
  'GameStatRight',
  'PlayBarLabel',
  'PlayBarDetailLabel',
  'PlaytimeIcon',
  'LastPlayed',
  'LastPlayedInfo',
);

interface Mounted {
  host: HTMLElement;
  root: ReactRoot;
  appId: number;
}

export function initStatRow(doc: Document): () => void {
  const mounts = new Map<Element, Mounted>();

  const unmount = (section: Element) => {
    const mounted = mounts.get(section);
    if (!mounted) return;
    mounted.root.unmount();
    mounted.host.remove();
    mounts.delete(section);
  };
  const unmountAll = () => {
    for (const section of Array.from(mounts.keys())) unmount(section);
  };

  const scan = () => {
    const appId = getSettings().statRow ? libraryAppIdFromPath(getLibraryPath()) : null;
    const classes = statClasses();
    if (!appId || !classes) {
      unmountAll();
      return;
    }
    injectStyles(doc, STYLE_ID, CSS);
    const sections = new Set<Element>(Array.from(doc.querySelectorAll('.' + classes.GameStatsSection)));
    for (const [section, mounted] of Array.from(mounts)) {
      if (!sections.has(section) || !section.contains(mounted.host) || mounted.appId !== appId) unmount(section);
    }
    for (const section of sections) {
      if (mounts.has(section)) continue;
      const host = doc.createElement('div');
      host.style.display = 'contents';
      section.appendChild(host);
      mounts.set(section, { host, root: mountReact(host, <ProtonDBStat appId={appId} classes={classes} />), appId });
    }
  };

  const stopSettings = subscribeSettings(scan);
  const stopObserver = observeThrottled(doc, scan, 200);
  return () => {
    stopObserver();
    stopSettings();
    unmountAll();
  };
}
