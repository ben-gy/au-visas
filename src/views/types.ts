// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import type { Category } from '../types';
import { squarify } from '../utils/squarify';
import { attachSvgZoom } from '../utils/svgZoom';
import { categoryColor } from '../colors';
import { formatNumber, formatPercent } from '../format';
import { SVGNS } from '../utils/svg';
import { infoIcon, glossaryLink } from '../glossary';

const W = 1000;
const H = 540;
let selected = 0;

export function renderTypes(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const categories = store.categories;
  const total = categories.reduce((a, c) => a + c.latest, 0) || 1;
  if (selected >= categories.length) selected = 0;

  const wrap = document.createElement('div');
  wrap.className = 'view view-types';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Visa types</h1>
      <p class="sub">Every ${glossaryLink('visa category', 'Visa category')} ${infoIcon('Visa category')} and the ${glossaryLink('subclasses', 'Visa subclass')} ${infoIcon('Visa subclass')} inside it, sized by how many people hold each right now. Click a block to break it down.</p>
    </header>
    <div class="treemap-wrap">
      <div class="treemap-canvas" id="tm-canvas"></div>
    </div>
    <div class="cat-detail" id="cat-detail"></div>`;

  const canvas = wrap.querySelector<HTMLElement>('#tm-canvas')!;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'treemap');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const outer = squarify(categories.map((c) => c.latest), W, H);
  categories.forEach((cat, ci) => {
    const r = outer[ci];
    if (r.w < 1 || r.h < 1) return;
    const g = document.createElementNS(SVGNS, 'g');
    const labelBand = r.h > 46 && r.w > 80 ? 20 : 0;
    // subclass rects inside this category rect
    const subVals = cat.subclasses.map((s) => s.latest);
    const inner = squarify(subVals, r.w - 2, r.h - 2 - labelBand);
    cat.subclasses.forEach((sub, si) => {
      const ir = inner[si];
      if (ir.w < 0.5 || ir.h < 0.5) return;
      const rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', String(r.x + 1 + ir.x));
      rect.setAttribute('y', String(r.y + 1 + labelBand + ir.y));
      rect.setAttribute('width', String(Math.max(0, ir.w)));
      rect.setAttribute('height', String(Math.max(0, ir.h)));
      rect.setAttribute('fill', categoryColor(cat.name));
      rect.setAttribute('fill-opacity', String(0.55 + 0.4 * (1 - si / Math.max(1, cat.subclasses.length))));
      rect.setAttribute('stroke', '#ffffff');
      rect.setAttribute('stroke-width', '0.8');
      rect.setAttribute('class', 'tm-cell');
      rect.setAttribute('data-tip', `${sub.name} · ${cat.name}: ${formatNumber(sub.latest)} (${formatPercent(sub.latest / total)})`);
      rect.setAttribute('aria-label', `${sub.name}: ${formatNumber(sub.latest)}`);
      rect.addEventListener('click', () => { selected = ci; paintDetail(); highlight(); });
      // subclass label if room
      if (ir.w > 64 && ir.h > 22) {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', String(r.x + 5 + ir.x));
        t.setAttribute('y', String(r.y + 1 + labelBand + ir.y + 14));
        t.setAttribute('class', 'tm-sublabel');
        t.textContent = fitText(shortSub(sub.name), ir.w - 8, 5.6);
        g.append(rect, t);
      } else {
        g.append(rect);
      }
    });
    // category label band — truncate to the block width so it never overflows
    if (labelBand) {
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', String(r.x + 6));
      t.setAttribute('y', String(r.y + 15));
      t.setAttribute('class', 'tm-catlabel');
      const full = `${cat.name}  ·  ${formatNumber(cat.latest)}`;
      const avail = r.w - 12;
      // prefer the full "name · count"; if it won't fit, drop the count; then truncate the name
      t.textContent = full.length * 6.6 <= avail ? full : fitText(cat.name, avail, 6.6);
      g.append(t);
    }
    // outer border
    const border = document.createElementNS(SVGNS, 'rect');
    border.setAttribute('x', String(r.x + 0.5));
    border.setAttribute('y', String(r.y + 0.5));
    border.setAttribute('width', String(Math.max(0, r.w - 1)));
    border.setAttribute('height', String(Math.max(0, r.h - 1)));
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', '#0f172a');
    border.setAttribute('stroke-width', '1');
    border.setAttribute('class', 'tm-border');
    border.dataset.cat = String(ci);
    g.append(border);
    svg.append(g);
  });

  canvas.append(svg);
  attachSvgZoom(svg, { maxScale: 12 });

  const detail = wrap.querySelector<HTMLElement>('#cat-detail')!;

  function highlight(): void {
    svg.querySelectorAll<SVGRectElement>('.tm-border').forEach((b) => {
      b.classList.toggle('sel', b.dataset.cat === String(selected));
    });
  }
  function paintDetail(): void {
    const cat = categories[selected];
    const catTotal = cat.latest || 1;
    const secShare = cat.secondary / (cat.primary + cat.secondary || 1);
    detail.innerHTML = `
      <div class="cd-head">
        <span class="cd-swatch" style="background:${categoryColor(cat.name)}"></span>
        <div>
          <h2>${cat.name}</h2>
          <p>${formatNumber(cat.latest)} holders · ${formatPercent(cat.latest / total)} of all temporary visas · ${formatPercent(secShare)} ${glossaryLink('family members', 'Primary vs secondary applicant')}</p>
        </div>
      </div>
      <div class="cd-cols">
        <div class="cd-col">
          <h3>Subclasses</h3>
          <div class="cd-bars">${cat.subclasses.slice(0, 10).map((s) => barRow(s.name, s.latest, catTotal, categoryColor(cat.name))).join('')}</div>
        </div>
        <div class="cd-col">
          <h3>Top nationalities in this visa</h3>
          <div class="cd-chips" id="cd-chips"></div>
        </div>
      </div>`;
    const chips = detail.querySelector<HTMLElement>('#cd-chips')!;
    for (const tc of cat.topCountries) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cd-chip';
      chip.innerHTML = `<span>${tc.name}</span><b>${formatNumber(tc.latest)}</b>`;
      chip.setAttribute('data-tip', `${tc.name}: ${formatNumber(tc.latest)} on ${cat.name} visas`);
      if (tc.iso3) chip.addEventListener('click', () => ctx.openCountry(tc.iso3, undefined));
      else chip.disabled = true;
      chips.append(chip);
    }
  }

  host.append(wrap);
  paintDetail();
  highlight();
}

function barRow(name: string, value: number, total: number, color: string): string {
  const w = (value / total) * 100;
  return `<div class="cd-bar-row" data-tip="${name}: ${formatNumber(value)}">
    <span class="cd-bar-name">${shortSub(name)}</span>
    <span class="cd-bar-track"><span class="cd-bar-fill" style="width:${w}%;background:${color}"></span></span>
    <span class="cd-bar-val mono">${formatNumber(value)}</span>
  </div>`;
}

function shortSub(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

/** Truncate `text` with an ellipsis so it fits within `widthPx` (approx charPx per glyph). */
function fitText(text: string, widthPx: number, charPx: number): string {
  const maxChars = Math.floor(widthPx / charPx);
  if (maxChars <= 1) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
}

export function _resetTypeSelection(): void { selected = 0; }
export type { Category };
