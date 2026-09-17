import { AppFilter, ReactRoot, classModuleFinder, findFiberProps, getUIStore, mountReact } from '../../lib/steam';
import { onRatingUpdate } from '../../stores/ratings';
import { getSettings, subscribeSettings } from '../../stores/settings';
import { injectStyles, observeThrottled } from '../../utils/dom';
import { log } from '../../utils/logger';
import { BucketProps, PanelClasses, ProtonDBBucket } from './components/protondb-bucket';
import { clearTierSelection, ensureTierGroup, installFilterPatch, rematchLibrary, uninstallFilterPatch } from './filter-patch';
import { FILTER_STYLE_ID, filterCss } from './styles';

const HOST_CLASS = 'pdb-bucket-host';

const panelClasses = classModuleFinder('Container', 'WideFormat', 'FilterArea', 'FilterBucket', 'FilterBucketLabel', 'FilterBucketBoxes', 'Row', 'Checkbox');

type PanelProps = Pick<BucketProps, 'appFilter' | 'fnOnChange'>;

const isPanelProps = (props: Record<string, unknown>): props is PanelProps & Record<string, unknown> =>
  typeof (props.appFilter as Partial<AppFilter> | undefined)?.SelectOption === 'function';

interface Mounted {
  host: HTMLElement;
  root: ReactRoot;
}

const filterAreas = (doc: Document, c: PanelClasses): HTMLElement[] =>
  Array.from(doc.querySelectorAll<HTMLElement>('.' + c.FilterArea)).filter((el) => !el.id);

export function initLibraryFilter(doc: Document): () => void {
  const mounts = new Map<Element, Mounted>();

  const unmount = (area: Element) => {
    const mounted = mounts.get(area);
    if (!mounted) return;
    try {
      mounted.root.unmount();
    } catch (e) {
      log('bucket unmount failed', e);
    }
    mounted.host.remove();
    mounts.delete(area);
  };
  const unmountAll = () => {
    for (const area of Array.from(mounts.keys())) unmount(area);
  };

  const mountInto = (area: HTMLElement, classes: PanelClasses): Mounted => {
    injectStyles(doc, FILTER_STYLE_ID, filterCss(classes));
    const host = doc.createElement('div');
    host.className = HOST_CLASS;
    host.style.display = 'contents';
    area.appendChild(host);
    const mounted = { host, root: mountReact(host, null) };
    mounts.set(area, mounted);
    return mounted;
  };

  const scan = () => {
    if (!getSettings().filterButton) {
      unmountAll();
      if (uninstallFilterPatch()) clearTierSelection(getUIStore()?.currentAppFilter);
      return;
    }
    installFilterPatch();
    const classes = panelClasses();
    if (!classes) return;

    const areas = filterAreas(doc, classes);
    for (const [area, mounted] of Array.from(mounts)) {
      if (!areas.includes(area as HTMLElement) || !area.contains(mounted.host)) unmount(area);
    }
    for (const area of areas) {
      const props = findFiberProps(area, isPanelProps);
      if (!props || !ensureTierGroup(props.appFilter)) continue;
      const mounted = mounts.get(area) ?? mountInto(area, classes);
      mounted.root.render(<ProtonDBBucket appFilter={props.appFilter} fnOnChange={props.fnOnChange} classes={classes} />);
    }
  };

  const stopSettings = subscribeSettings(scan);
  const stopRatings = onRatingUpdate(rematchLibrary);
  const stopObserver = observeThrottled(doc, scan, 200);

  return () => {
    stopObserver();
    stopSettings();
    stopRatings();
    unmountAll();
    uninstallFilterPatch();
  };
}
