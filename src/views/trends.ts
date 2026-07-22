// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import { renderLineChart, type LineSeries } from '../utils/linechart';
import { categoryColor } from '../colors';
import { formatNumber } from '../format';
import { infoIcon, glossaryLink } from '../glossary';

let mode: 'stacked' | 'lines' = 'stacked';
const hidden = new Set<string>();

export function renderTrends(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const categories = [...store.categories].sort((a, b) => a.latest - b.latest); // small at bottom for stacking

  const wrap = document.createElement('div');
  wrap.className = 'view view-trends';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Trends over time</h1>
      <p class="sub">Every ${glossaryLink('visa category', 'Visa category')} across ${store.meta.dates.length} ${glossaryLink('snapshots', 'Snapshot date')} ${infoIcon('Snapshot date')} from ${new Date(store.meta.earliestDate).getFullYear()} to ${new Date(store.meta.latestDate).getFullYear()}. The COVID collapse and the record post-2022 rebound are unmistakable here.</p>
    </header>
    <div class="toolbar">
      <div class="seg-toggle" role="tablist" aria-label="Chart mode">
        <button type="button" data-mode="stacked" class="${mode === 'stacked' ? 'active' : ''}">Stacked area</button>
        <button type="button" data-mode="lines" class="${mode === 'lines' ? 'active' : ''}">Lines</button>
      </div>
      <div class="sort-note">Click a category below to show or hide it.</div>
    </div>
    <div class="chart-host" id="chart-host"></div>
    <div class="trend-legend" id="trend-legend"></div>`;

  const chartHost = wrap.querySelector<HTMLElement>('#chart-host')!;
  const legend = wrap.querySelector<HTMLElement>('#trend-legend')!;

  function draw(): void {
    chartHost.innerHTML = '';
    const series: LineSeries[] = categories
      .filter((c) => !hidden.has(c.name))
      .map((c) => ({ name: c.name, color: categoryColor(c.name), values: c.series }));
    renderLineChart(chartHost, {
      dates: store.meta.dates,
      series,
      stacked: mode === 'stacked',
      height: 420,
    });
  }

  function drawLegend(): void {
    legend.innerHTML = '';
    for (const c of [...categories].sort((a, b) => b.latest - a.latest)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tl-item ${hidden.has(c.name) ? 'off' : ''}`;
      b.innerHTML = `<i style="background:${categoryColor(c.name)}"></i><span>${c.name}</span><b>${formatNumber(c.latest)}</b>`;
      b.addEventListener('click', () => {
        if (hidden.has(c.name)) hidden.delete(c.name); else hidden.add(c.name);
        // never hide everything
        if (hidden.size >= categories.length) hidden.delete(c.name);
        draw(); drawLegend();
      });
      legend.append(b);
    }
  }

  wrap.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode as 'stacked' | 'lines';
      wrap.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === btn));
      draw();
    });
  });

  host.append(wrap);
  draw();
  drawLegend();
}
