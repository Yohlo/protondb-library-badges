import { log } from './logger';
import { throttle } from './throttle';

export function injectStyles(doc: Document, id: string, css: string): void {
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}

export function observeThrottled(doc: Document, callback: () => void, delayMs: number): () => void {
  const run = () => {
    try {
      callback();
    } catch (e) {
      log('observer callback error', e);
    }
  };
  const scheduled = throttle(run, delayMs);
  const observer = new MutationObserver(scheduled);
  observer.observe(doc.body, { childList: true, subtree: true });
  run();
  return () => {
    observer.disconnect();
    scheduled.cancel();
  };
}
