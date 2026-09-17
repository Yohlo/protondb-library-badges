import { Rating, TIER_INFO, tierMarkerCss } from '../../config/tiers';
import { onRatingUpdate, cachedRating, requestRating } from '../../stores/ratings';
import { classModuleFinder, findAppIdFromElement, isSteamApp } from '../../lib/steam';
import { getSettings, subscribeSettings } from '../../stores/settings';
import { injectStyles, observeThrottled } from '../../utils/dom';

const STYLE_ID = 'protondb-sidebar-styles';
const DOT = 'pdb-dot';
const APP_ATTR = 'data-pdb-app';

const rowClasses = classModuleFinder('GameListEntryContainer', 'GameIcon', 'GameListEntryName', 'StatusIcon', 'Uninstalled');
type RowClasses = NonNullable<ReturnType<typeof rowClasses>>;

const sidebarCss = (c: RowClasses) => `
.${DOT} {
  display: inline-block; flex: 0 0 auto;
  width: 6px; height: 6px; border-radius: 50%;
  margin-left: -12px; margin-right: 6px;
  visibility: hidden;
}
${tierMarkerCss('.' + DOT)}
.${c.StatusIcon}:not(:empty) + .${DOT} { margin-left: 0; margin-right: 3px; }
.${DOT}[data-tier]:not([data-tier="none"]) { visibility: visible; }
.${c.Uninstalled} .${DOT} { opacity: .55; }
`;

function applyRating(dot: HTMLElement, rating: Rating | null): void {
  if (!rating) {
    dot.dataset.tier = 'none';
    dot.removeAttribute('title');
    return;
  }
  const info = TIER_INFO[rating.tier];
  dot.dataset.tier = rating.tier;
  dot.style.setProperty('--pdb-color', info.color);
  dot.title = `ProtonDB: ${info.label}`;
}

function attachDot(doc: Document, row: HTMLElement, c: RowClasses): HTMLElement {
  const dot = doc.createElement('span');
  dot.className = DOT;
  let anchor: Element | null = row.querySelector('.' + c.GameIcon);
  while (anchor && anchor.parentElement !== row) anchor = anchor.parentElement;
  if (anchor) row.insertBefore(dot, anchor);
  else row.prepend(dot);
  return dot;
}

function decorateRow(doc: Document, row: HTMLElement, c: RowClasses): void {
  const appId = findAppIdFromElement(row);
  const existing = row.querySelector<HTMLElement>(`:scope > .${DOT}`);
  if (!appId) {
    existing?.remove();
    row.removeAttribute(APP_ATTR);
    return;
  }
  if (existing && row.getAttribute(APP_ATTR) === String(appId)) return;

  existing?.remove();
  row.setAttribute(APP_ATTR, String(appId));
  const dot = attachDot(doc, row, c);
  if (!isSteamApp(appId)) {
    applyRating(dot, null);
    return;
  }
  const known = cachedRating(appId);
  if (known) applyRating(dot, known);
  else requestRating(appId, 'low');
}

export function initSidebarDots(doc: Document): () => void {
  let decorated = false;

  const stopRatings = onRatingUpdate((appId, rating) => {
    const dots = doc.querySelectorAll<HTMLElement>(`[${APP_ATTR}="${appId}"] > .${DOT}`);
    dots.forEach((dot) => applyRating(dot, rating));
    if (!rating && dots.length) requestRating(appId, 'low');
  });

  const clearAll = () => {
    doc.querySelectorAll(`.${DOT}`).forEach((dot) => dot.remove());
    doc.querySelectorAll(`[${APP_ATTR}]`).forEach((row) => row.removeAttribute(APP_ATTR));
    decorated = false;
  };

  const scan = () => {
    const c = rowClasses();
    if (!c) return;
    if (!getSettings().sidebarDots) {
      if (decorated) clearAll();
      return;
    }
    injectStyles(doc, STYLE_ID, sidebarCss(c));
    decorated = true;
    doc.querySelectorAll<HTMLElement>('.' + c.GameListEntryContainer).forEach((row) => decorateRow(doc, row, c));
  };

  const stopSettings = subscribeSettings(scan);
  const stopObserver = observeThrottled(doc, scan, 150);
  return () => {
    stopObserver();
    stopSettings();
    stopRatings();
    clearAll();
  };
}
