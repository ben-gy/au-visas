// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import { formatCompact, formatNumber, formatMonthYear } from '../format';
import { SVGNS } from './svg';

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export interface LineChartOpts {
  dates: string[];
  series: LineSeries[];
  height?: number;
  width?: number;
  stacked?: boolean;
  yLabel?: string;
}

/**
 * Render a responsive multi-series line (or stacked-area) chart with axes,
 * gridlines and a hover crosshair + tooltip that reads every series at the
 * nearest snapshot. Pure SVG.
 */
export function renderLineChart(container: HTMLElement, opts: LineChartOpts): void {
  const W = opts.width ?? 900;
  const H = opts.height ?? 380;
  const m = { top: 16, right: 18, bottom: 34, left: 56 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const dates = opts.dates;
  const n = dates.length;

  // Compute max (stacked sums, or per-series max)
  let max = 0;
  if (opts.stacked) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const ser of opts.series) s += ser.values[i] ?? 0;
      if (s > max) max = s;
    }
  } else {
    for (const ser of opts.series) for (const v of ser.values) if (v > max) max = v;
  }
  max = max || 1;
  const niceMax = niceCeil(max);

  const x = (i: number) => m.left + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = (v: number) => m.top + ih - (v / niceMax) * ih;

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'linechart');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');

  const add = (tag: string, attrs: Record<string, string | number>, parent: Element = svg) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    parent.append(e);
    return e;
  };

  // y gridlines + labels
  const ticks = 5;
  for (let t = 0; t <= ticks; t++) {
    const v = (niceMax / ticks) * t;
    const yy = y(v);
    add('line', { x1: m.left, y1: yy, x2: m.left + iw, y2: yy, class: 'lc-grid' });
    add('text', { x: m.left - 8, y: yy + 4, class: 'lc-ylabel', 'text-anchor': 'end' }).textContent = formatCompact(v);
  }

  // x labels (about 6 evenly spaced, always include first & last)
  const step = Math.max(1, Math.round(n / 6));
  for (let i = 0; i < n; i += step) {
    add('text', { x: x(i), y: H - 12, class: 'lc-xlabel', 'text-anchor': 'middle' }).textContent = yearOf(dates[i]);
  }
  add('text', { x: x(n - 1), y: H - 12, class: 'lc-xlabel', 'text-anchor': 'end' }).textContent = yearOf(dates[n - 1]);

  if (opts.stacked) {
    // stacked areas, bottom-up in given order
    const baseline = new Array(n).fill(0);
    for (const ser of opts.series) {
      const top = ser.values.map((v, i) => (baseline[i] += v, baseline[i]));
      const prev = top.map((tv, i) => tv - ser.values[i]);
      let d = '';
      top.forEach((tv, i) => { d += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(tv).toFixed(1)} `; });
      for (let i = n - 1; i >= 0; i--) d += `L${x(i).toFixed(1)} ${y(prev[i]).toFixed(1)} `;
      d += 'Z';
      add('path', { d, fill: ser.color, 'fill-opacity': '0.85', stroke: ser.color, 'stroke-width': 0.5 });
    }
  } else {
    for (const ser of opts.series) {
      const d = ser.values
        .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(' ');
      add('path', { d, fill: 'none', stroke: ser.color, 'stroke-width': 2, 'stroke-linejoin': 'round' });
    }
  }

  // hover layer
  const crosshair = add('line', { x1: 0, y1: m.top, x2: 0, y2: m.top + ih, class: 'lc-cross', opacity: 0 });
  const dots: SVGElement[] = opts.series.map((ser) =>
    add('circle', { r: 3.5, fill: ser.color, stroke: '#fff', 'stroke-width': 1.5, opacity: 0 }),
  );
  const overlay = add('rect', { x: m.left, y: m.top, width: iw, height: ih, fill: 'transparent', class: 'lc-overlay' });

  const tip = document.createElement('div');
  tip.className = 'lc-tip';
  tip.style.display = 'none';
  container.style.position = 'relative';

  const move = (evt: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    let i = Math.round(((px - m.left) / iw) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    crosshair.setAttribute('x1', String(x(i)));
    crosshair.setAttribute('x2', String(x(i)));
    crosshair.setAttribute('opacity', '1');
    if (opts.stacked) {
      let base = 0;
      opts.series.forEach((ser, si) => {
        base += ser.values[i] ?? 0;
        dots[si].setAttribute('cx', String(x(i)));
        dots[si].setAttribute('cy', String(y(base)));
        dots[si].setAttribute('opacity', '1');
      });
    } else {
      opts.series.forEach((ser, si) => {
        dots[si].setAttribute('cx', String(x(i)));
        dots[si].setAttribute('cy', String(y(ser.values[i] ?? 0)));
        dots[si].setAttribute('opacity', '1');
      });
    }
    const rows = opts.series
      .map((ser) => `<span class="k"><i style="background:${ser.color}"></i>${ser.name}</span><span class="v">${formatNumber(ser.values[i] ?? 0)}</span>`)
      .join('');
    tip.innerHTML = `<div class="lc-tip-date">${formatMonthYear(dates[i])}</div><div class="lc-tip-grid">${rows}</div>`;
    tip.style.display = 'block';
    const tr = tip.getBoundingClientRect();
    let left = ((x(i) / W) * rect.width) + 14;
    if (left + tr.width > rect.width) left = ((x(i) / W) * rect.width) - tr.width - 14;
    tip.style.left = `${Math.max(4, left)}px`;
    tip.style.top = `8px`;
  };
  const leave = () => {
    crosshair.setAttribute('opacity', '0');
    dots.forEach((d) => d.setAttribute('opacity', '0'));
    tip.style.display = 'none';
  };
  overlay.addEventListener('pointermove', move as EventListener);
  overlay.addEventListener('pointerleave', leave);

  container.append(svg, tip);
}

export function niceCeil(v: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice = 10;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  return nice * mag;
}
function yearOf(iso: string): string {
  return String(new Date(iso).getFullYear());
}
export { formatMonthYear };
