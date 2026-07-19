// feedback:begin (managed by hub/scripts/feedback/backfill.mjs)
import { mountFeedback } from './feedback';
mountFeedback();
// feedback:end

import './styles.css';
import 'leaflet/dist/leaflet.css';
import { loadData } from './data';
import { initTooltip } from './components/tooltip';
import { GLOSSARY_MAP } from './glossary';
import { openAbout } from './components/about';
import { openCountryPanel } from './views/detail';
import type { DataStore, ViewId } from './types';
import { formatFullDate, formatNumber } from './format';
import { el, clear } from './utils/svg';

import { renderInsights } from './views/insights';
import { renderMap } from './views/map';
import { renderCountries } from './views/countries';
import { renderTypes } from './views/types';
import { renderTrends } from './views/trends';
import { renderMatrix } from './views/matrix';
import { renderFlow } from './views/flow';

export interface AppCtx {
  store: DataStore;
  openCountry: (iso: string | null, raw?: string) => void;
  goTo: (view: ViewId) => void;
}

const VIEWS: { id: ViewId; label: string; render: (c: HTMLElement, ctx: AppCtx) => void }[] = [
  { id: 'insights', label: 'Insights', render: renderInsights },
  { id: 'map', label: 'Map', render: renderMap },
  { id: 'countries', label: 'Nationalities', render: renderCountries },
  { id: 'types', label: 'Visa Types', render: renderTypes },
  { id: 'trends', label: 'Trends', render: renderTrends },
  { id: 'matrix', label: 'Matrix', render: renderMatrix },
  { id: 'flow', label: 'Flow', render: renderFlow },
];

let currentView: ViewId = 'insights';
let store: DataStore;

function parseHash(): { view: ViewId | null; country: string | null } {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const v = h.get('view') as ViewId | null;
  return { view: VIEWS.some((x) => x.id === v) ? v : null, country: h.get('c') };
}

function writeHash(view: ViewId, country: string | null): void {
  const p = new URLSearchParams();
  p.set('view', view);
  if (country) p.set('c', country);
  const next = '#' + p.toString();
  if (location.hash !== next) history.replaceState(null, '', next);
}

function renderView(view: ViewId, ctx: AppCtx): void {
  currentView = view;
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const host = document.getElementById('view-host')!;
  clear(host);
  host.scrollTop = 0;
  const def = VIEWS.find((v) => v.id === view)!;
  def.render(host, ctx);
  writeHash(view, activeCountry);
}

let activeCountry: string | null = null;

function buildContext(): AppCtx {
  return {
    store,
    goTo: (view) => renderView(view, ctx),
    openCountry: (iso, raw) => {
      const country = iso
        ? store.countryByIso.get(iso) || store.countries.find((c) => c.raw === raw)
        : store.countries.find((c) => c.raw === raw);
      if (!country) return;
      activeCountry = country.iso3 || country.raw;
      writeHash(currentView, activeCountry);
      openCountryPanel(country, ctx, () => {
        activeCountry = null;
        writeHash(currentView, null);
      });
    },
  };
}

let ctx: AppCtx;

function buildChrome(): void {
  const app = document.getElementById('app')!;
  clear(app);

  const header = el('header', { class: 'site-header' });
  const brand = el('a', { class: 'brand', href: '#view=insights' });
  brand.innerHTML = `
    <span class="brand-mark" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f766e"/><circle cx="32" cy="30" r="11" fill="none" stroke="#5eead4" stroke-width="3"/><path d="M21 30 H43 M32 19 C37 23 37 37 32 41 C27 37 27 23 32 19 Z" fill="none" stroke="#5eead4" stroke-width="3"/></svg>
    </span>
    <span class="brand-text"><strong>Temporary Visa Holders</strong><small>Who is in Australia, and where from</small></span>`;
  header.append(brand);

  const nav = el('nav', { class: 'nav-tabs', 'aria-label': 'Views' });
  for (const v of VIEWS) {
    const btn = el('button', { class: 'nav-tab', type: 'button' }, v.label);
    btn.dataset.view = v.id;
    btn.addEventListener('click', () => { renderView(v.id, ctx); });
    nav.append(btn);
  }
  header.append(nav);

  const about = el('button', { class: 'about-btn', type: 'button', 'aria-label': 'About this data' }, '?');
  about.addEventListener('click', () => openAbout(store));
  header.append(about);

  const main = el('main', { class: 'main-content' });
  main.append(el('div', { id: 'view-host' }));

  const footer = el('footer', { class: 'site-footer' });
  footer.innerHTML = `
    <div class="foot-inner">
      <span>Data: <a href="${store.meta.sourceUrl}" target="_blank" rel="noopener">Dept of Home Affairs — Temporary visa holders in Australia</a> (${store.meta.licence}). Snapshot ${formatFullDate(store.meta.latestDate)}. Boundaries © Natural Earth.</span>
      <span>Built by <a href="https://benrichardson.dev/">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></span>
    </div>`;

  app.append(header, main, footer);
}

function initGlossary(): void {
  // Delegated click on [data-term] shows a definition popover.
  const pop = el('div', { class: 'glossary-pop', role: 'dialog' });
  pop.style.display = 'none';
  document.body.append(pop);

  function hide() { pop.style.display = 'none'; }

  document.addEventListener('click', (e) => {
    const t = (e.target as Element).closest('[data-term]') as HTMLElement | null;
    if (!t) { if (!(e.target as Element).closest('.glossary-pop')) hide(); return; }
    e.preventDefault();
    e.stopPropagation();
    const term = t.dataset.term!;
    const def = GLOSSARY_MAP.get(term);
    if (!def) return;
    pop.innerHTML = `<strong>${term}</strong><p>${def}</p>`;
    pop.style.display = 'block';
    const r = t.getBoundingClientRect();
    const pw = 300;
    let left = r.left;
    if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
    pop.style.left = `${Math.max(12, left)}px`;
    pop.style.top = `${r.bottom + 6 + window.scrollY}px`;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, { passive: true });
}

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = `<div class="boot"><div class="boot-inner"><div class="spinner"></div><p>Loading 14 years of visa data…</p></div></div>`;
  try {
    store = await loadData();
    ctx = buildContext();
    buildChrome();
    initTooltip();
    initGlossary();

    const { view, country } = parseHash();
    renderView(view || 'insights', ctx);
    if (country) {
      const c = store.countryByIso.get(country) || store.countries.find((x) => x.raw === country);
      if (c) ctx.openCountry(c.iso3, c.raw);
    }
    window.addEventListener('hashchange', () => {
      const h = parseHash();
      if (h.view && h.view !== currentView) renderView(h.view, ctx);
    });
  } catch (err) {
    app.innerHTML = `<div class="boot"><div class="boot-inner error">
      <h2>Could not load the data</h2>
      <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
      <button type="button" onclick="location.reload()">Retry</button>
    </div></div>`;
  }
}

// Guard against a totally empty dataset in the tiles.
export function totalLine(store: DataStore): string {
  return `${formatNumber(store.meta.totalLatest)} temporary visa holders`;
}

boot();
