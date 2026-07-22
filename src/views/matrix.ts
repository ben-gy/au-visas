// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import { sequentialColor, logScale } from '../colors';
import { formatNumber, formatPercent } from '../format';
import { infoIcon } from '../glossary';

const SHORT_CAT: Record<string, string> = {
  'Special Category': 'NZ (444)',
  'Student': 'Student',
  'Bridging': 'Bridging',
  'Visitor': 'Visitor',
  'Temporary Graduate': 'Graduate',
  'Temporary Resident (Skilled Employment)': 'Skilled work',
  'Working Holiday Maker': 'Wk holiday',
  'Temporary Resident (Other Employment)': 'Other work',
  'Crew and Transit': 'Crew',
  'Other Temporary': 'Other',
  'Temporary Protection': 'Protection',
};
const short = (c: string) => SHORT_CAT[c] ?? c;

let topN = 25;

export function renderMatrix(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const categories = store.categories;
  const countries = store.countries.filter((c) => c.iso3).slice(0, topN);
  const globalMax = Math.max(...countries.flatMap((c) => categories.map((cat) => c.categories[cat.name] || 0)), 1);

  const wrap = document.createElement('div');
  wrap.className = 'view view-matrix';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Nationality × visa type</h1>
      <p class="sub">Which nationalities dominate which visas. Colour is shaded by the number of holders (darker = more) ${infoIcon('Visa category')}. Hover any cell for exact figures; click a row to open that nationality.</p>
    </header>
    <div class="toolbar">
      <div class="seg-toggle" role="group" aria-label="Rows">
        <button type="button" data-n="15" class="${topN === 15 ? 'active' : ''}">Top 15</button>
        <button type="button" data-n="25" class="${topN === 25 ? 'active' : ''}">Top 25</button>
        <button type="button" data-n="40" class="${topN === 40 ? 'active' : ''}">Top 40</button>
      </div>
      <div class="sort-note">Darker cells = more people. Cell also shows its share of that nationality's total.</div>
    </div>
    <div class="matrix-scroll" id="matrix-scroll"></div>`;

  const scroll = wrap.querySelector<HTMLElement>('#matrix-scroll')!;
  const grid = document.createElement('div');
  grid.className = 'matrix-grid';
  grid.style.gridTemplateColumns = `minmax(150px, 1.4fr) repeat(${categories.length}, minmax(52px, 1fr))`;

  // header
  grid.append(cell('mx-corner', 'Nationality'));
  for (const cat of categories) {
    const h = cell('mx-colhead', short(cat.name));
    h.setAttribute('data-tip', `${cat.name}: ${formatNumber(cat.latest)} total`);
    grid.append(h);
  }

  for (const c of countries) {
    const total = Object.values(c.categories).reduce((a, b) => a + b, 0) || c.latest || 1;
    const name = cell('mx-rowhead', '');
    name.innerHTML = `<span class="mx-rank">${c.rank}</span><span class="mx-cty">${c.name}</span>`;
    name.setAttribute('role', 'button');
    name.tabIndex = 0;
    name.addEventListener('click', () => ctx.openCountry(c.iso3, c.raw));
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') ctx.openCountry(c.iso3, c.raw); });
    grid.append(name);
    for (const cat of categories) {
      const v = c.categories[cat.name] || 0;
      const t = logScale(v, globalMax);
      const d = document.createElement('div');
      d.className = 'mx-cell';
      d.style.background = v > 0 ? sequentialColor(t) : 'transparent';
      d.style.color = t > 0.55 ? '#f0fdfa' : '#0f172a';
      d.textContent = v > 0 ? compact(v) : '';
      d.setAttribute('data-tip', `${c.name} · ${cat.name}: ${formatNumber(v)} (${formatPercent(v / total)} of ${c.name}'s total)`);
      d.setAttribute('aria-label', `${c.name} ${cat.name}: ${formatNumber(v)}`);
      d.addEventListener('click', () => ctx.openCountry(c.iso3, c.raw));
      grid.append(d);
    }
  }

  scroll.append(grid);

  wrap.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((b) => {
    b.addEventListener('click', () => { topN = Number(b.dataset.n); host.innerHTML = ''; renderMatrix(host, ctx); });
  });

  host.append(wrap);
}

function cell(cls: string, text: string): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}
function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return Math.round(n / 1000) + 'k';
  if (n >= 1_000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
