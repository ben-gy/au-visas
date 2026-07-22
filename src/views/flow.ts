// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppCtx } from '../main';
import { categoryColor } from '../colors';
import { formatNumber, formatPercent } from '../format';
import { SVGNS } from '../utils/svg';
import { layoutColumn } from '../utils/sankey';
import { infoIcon } from '../glossary';

const W = 1000;
const H = 600;
const NODE_W = 16;
let topN = 12;

interface LeftNode { key: string; label: string; iso: string | null; raw?: string; value: number; y: number; h: number }
interface RightNode { name: string; value: number; y: number; h: number }

export function renderFlow(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const categories = store.categories;
  const grand = categories.reduce((a, c) => a + c.latest, 0) || 1;

  const top = store.countries.slice(0, topN);
  const topSet = new Set(top.map((c) => c.raw));

  // left nodes = top countries + aggregated "All other nationalities"
  const left: LeftNode[] = top.map((c) => ({ key: c.raw, label: c.name, iso: c.iso3, raw: c.raw, value: c.latest, y: 0, h: 0 }));
  const otherValue = store.countries.filter((c) => !topSet.has(c.raw)).reduce((a, c) => a + c.latest, 0);
  if (otherValue > 0) left.push({ key: '__other__', label: 'All other nationalities', iso: null, value: otherValue, y: 0, h: 0 });

  // right nodes = categories (their true totals)
  const right: RightNode[] = categories.map((c) => ({ name: c.name, value: c.latest, y: 0, h: 0 }));

  // value(leftKey, category)
  const catByCountry = (raw: string, cat: string): number => {
    if (raw === '__other__') {
      const c = categories.find((x) => x.name === cat)!;
      const fromTop = top.reduce((a, t) => a + (t.categories[cat] || 0), 0);
      return Math.max(0, c.latest - fromTop);
    }
    const country = store.countries.find((c) => c.raw === raw);
    return country?.categories[cat] || 0;
  };

  const wrap = document.createElement('div');
  wrap.className = 'view view-flow';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Where each nationality goes</h1>
      <p class="sub">Ribbons flow from the largest nationalities (left) to the ${infoIcon('Visa category')} visa categories they hold (right); ribbon width is the number of people. Hover a ribbon for exact figures, click a nationality to open its profile.</p>
    </header>
    <div class="toolbar">
      <div class="seg-toggle" role="group" aria-label="Nationalities shown">
        <button type="button" data-n="8" class="${topN === 8 ? 'active' : ''}">Top 8</button>
        <button type="button" data-n="12" class="${topN === 12 ? 'active' : ''}">Top 12</button>
        <button type="button" data-n="20" class="${topN === 20 ? 'active' : ''}">Top 20</button>
      </div>
      <div class="sort-note">Left → right, width = people. “All other nationalities” aggregates the rest so category totals stay true.</div>
    </div>
    <div class="flow-canvas" id="flow-canvas"></div>`;

  const canvas = wrap.querySelector<HTMLElement>('#flow-canvas')!;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'sankey');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // layout node heights (pure, tested — see utils/sankey.ts)
  const gap = 6;
  const leftSlots = layoutColumn(left.map((n) => n.value), H, gap);
  const rightSlots = layoutColumn(right.map((n) => n.value), H, gap);
  left.forEach((n, i) => { n.y = leftSlots[i].y; n.h = leftSlots[i].h; });
  right.forEach((n, i) => { n.y = rightSlots[i].y; n.h = rightSlots[i].h; });
  const scaleL = left.reduce((a, n) => a + n.h, 0) / grand;
  const scaleR = right.reduce((a, n) => a + n.h, 0) / grand;

  const leftX = 120;
  const rightX = W - 120 - NODE_W;

  // running offsets
  const leftOffset = new Map(left.map((n) => [n.key, n.y]));
  const rightOffset = new Map(right.map((n) => [n.name, n.y]));

  const ribbons: { el: SVGPathElement; from: string; to: string }[] = [];

  // draw ribbons in left-node then category order
  for (const ln of left) {
    for (const cat of categories) {
      const v = catByCountry(ln.key, cat.name);
      if (v <= 0) continue;
      const sh = v * scaleL;
      const th = v * scaleR;
      const sy = leftOffset.get(ln.key)!;
      const ty = rightOffset.get(cat.name)!;
      leftOffset.set(ln.key, sy + sh);
      rightOffset.set(cat.name, ty + th);
      const x0 = leftX + NODE_W;
      const x1 = rightX;
      const y0 = sy + sh / 2;
      const y1 = ty + th / 2;
      const mx = (x0 + x1) / 2;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', `M${x0} ${sy} C${mx} ${sy}, ${mx} ${ty}, ${x1} ${ty} L${x1} ${ty + th} C${mx} ${ty + th}, ${mx} ${sy + sh}, ${x0} ${sy + sh} Z`);
      void y0; void y1;
      path.setAttribute('fill', categoryColor(cat.name));
      path.setAttribute('fill-opacity', '0.4');
      path.setAttribute('class', 'sk-ribbon');
      path.setAttribute('data-tip', `${ln.label} → ${cat.name}: ${formatNumber(v)} (${formatPercent(v / ln.value)} of ${ln.label})`);
      path.dataset.from = ln.key;
      path.dataset.to = cat.name;
      ribbons.push({ el: path, from: ln.key, to: cat.name });
      svg.append(path);
    }
  }

  // nodes
  for (const ln of left) {
    const g = document.createElementNS(SVGNS, 'g');
    const rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', String(leftX)); rect.setAttribute('y', String(ln.y));
    rect.setAttribute('width', String(NODE_W)); rect.setAttribute('height', String(ln.h));
    rect.setAttribute('class', 'sk-node');
    rect.setAttribute('fill', '#334155');
    rect.setAttribute('data-tip', `${ln.label}: ${formatNumber(ln.value)}`);
    const label = document.createElementNS(SVGNS, 'text');
    label.setAttribute('x', String(leftX - 8)); label.setAttribute('y', String(ln.y + ln.h / 2 + 4));
    label.setAttribute('text-anchor', 'end'); label.setAttribute('class', 'sk-label');
    label.textContent = ln.label.length > 20 ? ln.label.slice(0, 19) + '…' : ln.label;
    g.append(rect, label);
    if (ln.iso || ln.raw) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => ctx.openCountry(ln.iso, ln.raw));
    }
    g.addEventListener('mouseenter', () => highlight('from', ln.key));
    g.addEventListener('mouseleave', clearHighlight);
    svg.append(g);
  }
  for (const rn of right) {
    const g = document.createElementNS(SVGNS, 'g');
    const rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', String(rightX)); rect.setAttribute('y', String(rn.y));
    rect.setAttribute('width', String(NODE_W)); rect.setAttribute('height', String(rn.h));
    rect.setAttribute('class', 'sk-node');
    rect.setAttribute('fill', categoryColor(rn.name));
    rect.setAttribute('data-tip', `${rn.name}: ${formatNumber(rn.value)}`);
    const label = document.createElementNS(SVGNS, 'text');
    label.setAttribute('x', String(rightX + NODE_W + 8)); label.setAttribute('y', String(rn.y + rn.h / 2 + 4));
    label.setAttribute('text-anchor', 'start'); label.setAttribute('class', 'sk-label');
    label.textContent = rn.name.length > 24 ? rn.name.slice(0, 23) + '…' : rn.name;
    g.append(rect, label);
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => ctx.goTo('types'));
    g.addEventListener('mouseenter', () => highlight('to', rn.name));
    g.addEventListener('mouseleave', clearHighlight);
    svg.append(g);
  }

  function highlight(kind: 'from' | 'to', key: string): void {
    for (const r of ribbons) {
      const match = kind === 'from' ? r.from === key : r.to === key;
      r.el.setAttribute('fill-opacity', match ? '0.75' : '0.08');
    }
  }
  function clearHighlight(): void {
    for (const r of ribbons) r.el.setAttribute('fill-opacity', '0.4');
  }

  canvas.append(svg);
  wrap.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((b) => {
    b.addEventListener('click', () => { topN = Number(b.dataset.n); host.innerHTML = ''; renderFlow(host, ctx); });
  });
  host.append(wrap);
}
