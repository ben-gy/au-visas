// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import type { Country } from '../types';
import { formatNumber, formatDelta } from '../format';
import { categoryColor } from '../colors';
import { sparklineSvg } from '../utils/svg';
import { pctChangeOverSnapshots } from '../analysis';
import { infoIcon } from '../glossary';

type SortKey = 'rank' | 'name' | 'latest' | 'growth' | 'share';
let sortKey: SortKey = 'latest';
let sortDir: -1 | 1 = -1;
let query = '';

export function renderCountries(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const perYear = snapsPerYear(store.meta.dates);
  const total = store.meta.totalLatest || 1;

  const rows = store.countries.map((c) => ({
    c,
    growth: pctChangeOverSnapshots(c.series, perYear),
    share: c.latest / total,
    dominant: dominantCategory(c),
  }));

  const wrap = document.createElement('div');
  wrap.className = 'view view-countries';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Nationalities</h1>
      <p class="sub">Every country of ${'citizenship'} ranked by how many of its citizens hold an Australian temporary visa. ${infoIcon('Citizenship country')} Search, sort, and click a row for the full profile.</p>
    </header>
    <div class="toolbar">
      <input type="search" class="search" id="cty-search" placeholder="Search a nationality…" aria-label="Search nationalities" value="${query}" />
      <div class="sort-note" id="cty-count"></div>
    </div>
    <div class="table-scroll">
      <table class="data-table" id="cty-table">
        <thead>
          <tr>
            <th class="col-rank" data-sort="rank">#</th>
            <th class="col-name" data-sort="name">Nationality</th>
            <th class="col-num" data-sort="latest">Holders</th>
            <th class="col-num" data-sort="share">Share</th>
            <th class="col-num" data-sort="growth">1-yr change</th>
            <th class="col-spark">14-year trend</th>
            <th class="col-cat">Main visa type</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>`;

  const tbody = wrap.querySelector('tbody')!;
  const countEl = wrap.querySelector('#cty-count')!;

  function paint(): void {
    const q = query.trim().toLowerCase();
    let filtered = rows.filter((r) => !q || r.c.name.toLowerCase().includes(q) || (r.c.iso3 || '').toLowerCase() === q);
    filtered.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      switch (sortKey) {
        case 'rank': av = a.c.rank; bv = b.c.rank; break;
        case 'name': av = a.c.name.toLowerCase(); bv = b.c.name.toLowerCase(); break;
        case 'latest': av = a.c.latest; bv = b.c.latest; break;
        case 'share': av = a.share; bv = b.share; break;
        case 'growth': av = a.growth ?? -Infinity; bv = b.growth ?? -Infinity; break;
      }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return a.c.rank - b.c.rank;
    });

    tbody.innerHTML = '';
    for (const r of filtered) {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.setAttribute('role', 'button');
      const col = categoryColor(r.dominant.name);
      const growthCell = r.growth === null
        ? '<span class="muted">—</span>'
        : `<span class="delta ${r.growth >= 0 ? 'up' : 'down'}">${formatDelta(r.growth)}</span>`;
      tr.innerHTML = `
        <td class="col-rank">${r.c.rank}</td>
        <td class="col-name"><span class="cty-name">${r.c.name}</span>${r.c.iso3 ? `<span class="iso">${r.c.iso3}</span>` : '<span class="iso muted">n/a</span>'}</td>
        <td class="col-num mono">${formatNumber(r.c.latest)}</td>
        <td class="col-num mono">${(r.share * 100).toFixed(r.share < 0.001 ? 3 : 2)}%</td>
        <td class="col-num">${growthCell}</td>
        <td class="col-spark">${sparklineSvg(r.c.series, 120, 28, '#0f766e')}</td>
        <td class="col-cat"><span class="cat-pill" style="--c:${col}" data-tip="${r.dominant.name}: ${formatNumber(r.dominant.value)} holders">${r.dominant.name}</span></td>`;
      tr.addEventListener('click', () => ctx.openCountry(r.c.iso3, r.c.raw));
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') ctx.openCountry(r.c.iso3, r.c.raw); });
      tbody.append(tr);
    }
    countEl.textContent = `${filtered.length} of ${rows.length} nationalities`;
    updateHeaders(wrap);
  }

  // header sorting
  wrap.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort as SortKey;
      if (sortKey === k) sortDir = (sortDir === 1 ? -1 : 1);
      else { sortKey = k; sortDir = (k === 'name' ? 1 : -1); }
      paint();
    });
  });

  // debounced search
  const input = wrap.querySelector<HTMLInputElement>('#cty-search')!;
  let t: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(t);
    t = window.setTimeout(() => { query = input.value; paint(); }, 250);
  });

  host.append(wrap);
  paint();
  input.focus();
}

function updateHeaders(wrap: HTMLElement): void {
  wrap.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
    th.classList.toggle('sorted', th.dataset.sort === sortKey);
    th.dataset.dir = th.dataset.sort === sortKey ? (sortDir === 1 ? 'asc' : 'desc') : '';
  });
}

function dominantCategory(c: Country): { name: string; value: number } {
  let name = '—', value = 0;
  for (const [k, v] of Object.entries(c.categories)) if (v > value) { value = v; name = k; }
  return { name, value };
}

function snapsPerYear(dates: string[]): number {
  if (dates.length < 2) return 4;
  const days = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[dates.length - 2]).getTime()) / 86_400_000;
  return days > 60 ? 4 : 12;
}
