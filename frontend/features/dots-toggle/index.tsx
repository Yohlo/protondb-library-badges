import { ReactRoot, classModuleFinder, mountReact } from '../../lib/steam';
import { injectStyles, observeThrottled } from '../../utils/dom';
import { log } from '../../utils/logger';
import { DotsToggleButton } from './components/dots-toggle-button';

const HOST_CLASS = 'pdb-dots-toggle';
const STYLE_ID = 'protondb-dots-toggle-styles';
const CSS = `.${HOST_CLASS} svg { width: 16px; height: 16px; }`;

const rowClasses = classModuleFinder('ViewFiltersBar', 'Filters', 'CheckboxWithImage', 'Active', 'Disabled');

export function initDotsToggle(doc: Document): () => void {
  let mounted: { host: HTMLElement; root: ReactRoot } | null = null;

  const unmount = () => {
    if (!mounted) return;
    try {
      mounted.root.unmount();
    } catch (e) {
      log('dots toggle unmount failed', e);
    }
    mounted.host.remove();
    mounted = null;
  };

  const scan = () => {
    const c = rowClasses();
    if (!c) return;
    const row = doc.querySelector<HTMLElement>(`.${c.ViewFiltersBar} > .${c.Filters}`);
    if (!row) {
      unmount();
      return;
    }
    if (mounted && row.contains(mounted.host)) return;
    unmount();
    injectStyles(doc, STYLE_ID, CSS);
    const host = doc.createElement('div');
    host.className = HOST_CLASS;
    host.style.display = 'contents';
    row.appendChild(host);
    mounted = { host, root: mountReact(host, <DotsToggleButton classes={c} />) };
  };

  const stopObserver = observeThrottled(doc, scan, 200);
  return () => {
    stopObserver();
    unmount();
  };
}
