// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import { computeInsights } from '../analysis';
import { formatFullDate, formatNumber, formatDelta } from '../format';
import { categoryColor } from '../colors';
import { infoIcon, glossaryLink } from '../glossary';

export function renderInsights(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const { meta, countries, categories } = store;
  const realCountries = countries.filter((c) => c.iso3);

  const wrap = document.createElement('div');
  wrap.className = 'view view-insights';

  const growth = (meta.totalLatest - meta.totalEarliest) / meta.totalEarliest;
  const topCountry = realCountries[0];
  const topCat = categories[0];

  wrap.innerHTML = `
    <header class="view-head">
      <h1>Temporary visa holders in Australia</h1>
      <p class="sub">A ${glossaryLink('point-in-time count', 'Stock')} of everyone living in Australia on a ${glossaryLink('temporary visa', 'Temporary visa holder')} ${infoIcon('Temporary visa holder')} — students, workers, backpackers, visitors and New Zealanders — as at ${formatFullDate(meta.latestDate)}.</p>
    </header>

    <div class="stat-row">
      <div class="stat-tile big">
        <span class="stat-label">Temporary visa holders</span>
        <span class="stat-value">${formatNumber(meta.totalLatest)}</span>
        <span class="stat-foot">${formatDelta(growth)} since ${new Date(meta.earliestDate).getFullYear()}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Nationalities</span>
        <span class="stat-value">${meta.countryCount}</span>
        <span class="stat-foot">countries of citizenship</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Largest source</span>
        <span class="stat-value">${topCountry ? formatNumber(topCountry.latest) : '—'}</span>
        <span class="stat-foot">${topCountry ? topCountry.name : ''}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Biggest visa type</span>
        <span class="stat-value">${topCat ? formatNumber(topCat.latest) : '—'}</span>
        <span class="stat-foot">${topCat ? topCat.name : ''}</span>
      </div>
    </div>

    <div class="total-trend">
      <div class="tt-head"><h2>Total temporary population, ${new Date(meta.earliestDate).getFullYear()}–${new Date(meta.latestDate).getFullYear()}</h2>
      <span class="muted">Watch the dip during COVID border closures, then the record post-2022 rebound.</span></div>
      <div class="tt-spark" id="tt-spark"></div>
    </div>

    <h2 class="section-title">What the data shows</h2>
    <p class="section-sub">Auto-detected from the latest release. Click any nationality name to open its full profile.</p>
    <div class="insight-grid" id="insight-grid"></div>
  `;

  // big total trend sparkline
  const spark = wrap.querySelector('#tt-spark')!;
  spark.innerHTML = bigSpark(meta.totalByDate, meta.dates);

  const grid = wrap.querySelector('#insight-grid')!;
  for (const ins of computeInsights(store)) {
    const card = document.createElement('div');
    card.className = `insight-card sev-${ins.severity}`;
    card.innerHTML = `
      <div class="ic-metric">${ins.metric}</div>
      <div class="ic-body">
        <h3>${linkifyCountries(ins.title, realCountries)}</h3>
        <p>${linkifyCountries(ins.detail, realCountries)}</p>
      </div>`;
    grid.append(card);
  }

  // category composition mini legend + bars
  const comp = document.createElement('div');
  comp.className = 'composition';
  comp.innerHTML = `<h2 class="section-title">Composition right now ${infoIcon('Visa category')}</h2>
    <p class="section-sub">Share of all temporary visa holders by ${glossaryLink('visa category', 'Visa category')}.</p>`;
  const bar = document.createElement('div');
  bar.className = 'comp-bar';
  const total = categories.reduce((a, c) => a + c.latest, 0) || 1;
  for (const c of categories) {
    const seg = document.createElement('div');
    seg.className = 'comp-seg';
    seg.style.width = `${(c.latest / total) * 100}%`;
    seg.style.background = categoryColor(c.name);
    seg.setAttribute('data-tip', `${c.name}: ${formatNumber(c.latest)} (${((c.latest / total) * 100).toFixed(1)}%)`);
    seg.setAttribute('aria-label', `${c.name}: ${formatNumber(c.latest)}`);
    bar.append(seg);
  }
  comp.append(bar);
  const legend = document.createElement('div');
  legend.className = 'comp-legend';
  for (const c of categories) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'comp-legend-item';
    item.innerHTML = `<i style="background:${categoryColor(c.name)}"></i><span>${c.name}</span><b>${formatNumber(c.latest)}</b>`;
    item.addEventListener('click', () => ctx.goTo('types'));
    legend.append(item);
  }
  comp.append(legend);
  wrap.append(comp);

  host.append(wrap);

  // Make country names clickable
  wrap.querySelectorAll<HTMLElement>('[data-country-iso]').forEach((elm) => {
    elm.addEventListener('click', () => ctx.openCountry(elm.dataset.countryIso!, undefined));
  });
}

function bigSpark(series: number[], dates: string[]): string {
  const w = 1000, h = 120, pad = 4;
  const max = Math.max(...series), min = Math.min(...series);
  const range = max - min || 1;
  const dx = (w - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => [pad + i * dx, pad + (1 - (v - min) / range) * (h - pad * 2)] as [number, number]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  // year gridlines
  let grid = '';
  dates.forEach((d, i) => {
    if (new Date(d).getMonth() === 11 || i === 0) {
      const x = pts[i][0];
      grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" class="bs-grid"/>`;
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="bigspark" aria-hidden="true">
    ${grid}
    <path d="${area}" fill="#0f766e" opacity="0.12"/>
    <path d="${line}" fill="none" stroke="#0f766e" stroke-width="2.5"/>
  </svg>`;
}

/** Replace known country names in text with clickable spans. */
function linkifyCountries(text: string, countries: { name: string; iso3: string | null }[]): string {
  let out = text;
  // longest names first to avoid partial overlaps
  const sorted = [...countries].filter((c) => c.iso3).sort((a, b) => b.name.length - a.name.length).slice(0, 40);
  for (const c of sorted) {
    if (out.includes(c.name)) {
      out = out.split(c.name).join(`<span class="country-link" data-country-iso="${c.iso3}">${c.name}</span>`);
      break; // link only the first/most-specific match per string
    }
  }
  return out;
}
