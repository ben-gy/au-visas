import type { AppCtx } from '../main';
import type { Country } from '../types';
import { categoryColor } from '../colors';
import { formatNumber, formatDelta, formatPercent, formatMonthYear } from '../format';
import { renderLineChart } from '../utils/linechart';
import { pctChangeOverSnapshots } from '../analysis';
import { peak } from '../analysis';
import { glossaryLink } from '../glossary';

let overlay: HTMLDivElement | null = null;
let onCloseCb: (() => void) | null = null;

export function openCountryPanel(country: Country, ctx: AppCtx, onClose: () => void): void {
  if (overlay) overlay.remove();
  onCloseCb = onClose;
  const { store } = ctx;
  const perYear = snapsPerYear(store.meta.dates);
  const yoy = pctChangeOverSnapshots(country.series, perYear);
  const total = store.meta.totalLatest || 1;
  const pk = peak(country.series);
  const cats = Object.entries(country.categories).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
  const catTotal = cats.reduce((a, c) => a + c.v, 0) || 1;
  const secShare = country.secondary / (country.primary + country.secondary || 1);

  overlay = document.createElement('div');
  overlay.className = 'panel-overlay';
  const panel = document.createElement('aside');
  panel.className = 'detail-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${country.name} visa profile`);

  panel.innerHTML = `
    <div class="dp-head">
      <div>
        <span class="dp-eyebrow">Nationality profile ${country.iso3 ? `· ${country.iso3}` : ''}</span>
        <h2>${country.name}</h2>
      </div>
      <button type="button" class="dp-close" aria-label="Close">×</button>
    </div>

    <div class="dp-stats">
      <div class="dp-stat"><span>Holders now</span><strong>${formatNumber(country.latest)}</strong></div>
      <div class="dp-stat"><span>Rank</span><strong>#${country.rank}${country.iso3 ? ` of ${store.meta.countryCount}` : ''}</strong></div>
      <div class="dp-stat"><span>Share of all</span><strong>${formatPercent(country.latest / total)}</strong></div>
      <div class="dp-stat"><span>1-year change</span><strong class="${yoy !== null && yoy < 0 ? 'down' : 'up'}">${yoy !== null ? formatDelta(yoy) : '—'}</strong></div>
    </div>

    <div class="dp-section">
      <h3>Since ${new Date(store.meta.earliestDate).getFullYear()}</h3>
      <div class="dp-chart" id="dp-chart"></div>
      <p class="dp-peak muted">Peak of ${formatNumber(pk.value)} in ${formatMonthYear(store.meta.dates[pk.index])}.</p>
    </div>

    <div class="dp-section">
      <h3>Visa types held ${glossaryLink('(family share ' + Math.round(secShare * 100) + '%)', 'Primary vs secondary applicant')}</h3>
      <div class="dp-cats">
        ${cats.map((c) => `
          <div class="dp-cat" data-tip="${c.name}: ${formatNumber(c.v)} (${formatPercent(c.v / catTotal)})">
            <span class="dp-cat-name"><i style="background:${categoryColor(c.name)}"></i>${c.name}</span>
            <span class="dp-cat-track"><span style="width:${(c.v / catTotal) * 100}%;background:${categoryColor(c.name)}"></span></span>
            <span class="dp-cat-val mono">${formatNumber(c.v)}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="dp-actions">
      <button type="button" class="dp-link" data-go="matrix">See in matrix →</button>
      <button type="button" class="dp-link" data-go="map">See on map →</button>
    </div>
  `;

  overlay.append(panel);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay?.classList.add('open'));

  // single-series trend chart
  const chart = panel.querySelector<HTMLElement>('#dp-chart')!;
  renderLineChart(chart, {
    dates: store.meta.dates,
    series: [{ name: country.name, color: '#0f766e', values: country.series }],
    height: 220,
    width: 620,
  });

  const close = () => closePanel();
  panel.querySelector('.dp-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  panel.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => {
    b.addEventListener('click', () => { ctx.goTo(b.dataset.go as any); close(); });
  });
  document.addEventListener('keydown', escHandler);
}

function escHandler(e: KeyboardEvent): void {
  if (e.key === 'Escape') closePanel();
}

export function closePanel(): void {
  if (!overlay) return;
  overlay.classList.remove('open');
  const o = overlay;
  overlay = null;
  document.removeEventListener('keydown', escHandler);
  setTimeout(() => o.remove(), 200);
  if (onCloseCb) { onCloseCb(); onCloseCb = null; }
}

function snapsPerYear(dates: string[]): number {
  if (dates.length < 2) return 4;
  const days = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[dates.length - 2]).getTime()) / 86_400_000;
  return days > 60 ? 4 : 12;
}
